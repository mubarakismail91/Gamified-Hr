import type { AddressInfo } from 'net';
import { io, type Socket } from 'socket.io-client';
import { bearer, createDepartment, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

/**
 * Item 6: notifications pushed over Socket.IO, driven by a Postgres trigger + LISTEN/NOTIFY.
 * The last test measures end-to-end delivery time for NFR4 (< 1 s).
 */
describe('Real-time notifications (API)', () => {
  let ctx: TestContext;
  let url: string;
  let adminToken: string;
  let team: Awaited<ReturnType<typeof createDepartment>>;
  let employeeToken: string;
  let colleagueToken: string;
  const sockets: Socket[] = [];

  const connect = (token: string | undefined) =>
    new Promise<Socket>((resolve, reject) => {
      const s = io(url, { auth: token === undefined ? {} : { token }, transports: ['websocket'], reconnection: false, forceNew: true });
      sockets.push(s);
      s.once('connect', () => resolve(s));
      s.once('connect_error', (err) => reject(err));
    });

  /** Resolves with the next 'notification' event, or null if none arrives within `ms`. */
  const nextEvent = (s: Socket, ms = 2000) =>
    new Promise<{ id: string; createdAt: string } | null>((resolve) => {
      const timer = setTimeout(() => {
        s.off('notification', onEvent);
        resolve(null);
      }, ms);
      const onEvent = (e: { id: string; createdAt: string }) => {
        clearTimeout(timer);
        resolve(e);
      };
      s.once('notification', onEvent);
    });

  beforeAll(async () => {
    ctx = await createTestApp();
    await ctx.app.listen(0);
    url = `http://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}`;
    await resetDatabase(ctx.prisma);
    adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
    team = await createDepartment(ctx.prisma, 'Research');
    employeeToken = await login(ctx, team.employee.email);
    colleagueToken = await login(ctx, team.colleague.email);
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await ctx.app.close();
  });

  describe('connecting', () => {
    it('refuses a connection without a token', async () => {
      await expect(connect(undefined)).rejects.toThrow('unauthorized');
    });

    it('refuses a forged token', async () => {
      await expect(connect('not-a-real-token')).rejects.toThrow('unauthorized');
    });

    it('refuses a deactivated account', async () => {
      const gone = await createUser(ctx.prisma, 'employee');
      const token = await login(ctx, gone.email);
      await ctx.prisma.user.update({ where: { id: gone.id }, data: { isActive: false } });
      await expect(connect(token)).rejects.toThrow('unauthorized');
    });

    it('accepts a valid access token', async () => {
      const s = await connect(employeeToken);
      expect(s.connected).toBe(true);
      s.disconnect();
    });
  });

  describe('delivery', () => {
    it('pushes a notification to its owner as soon as it is created (here: Kudos received)', async () => {
      const s = await connect(employeeToken);
      const event = nextEvent(s);
      await ctx
        .http()
        .post('/kudos')
        .set(bearer(colleagueToken))
        .send({ toUserId: team.employee.id, value: 'service', message: 'Thank you for covering my class.' })
        .expect(204);

      const received = await event;
      const row = await ctx.prisma.notification.findFirstOrThrow({ where: { userId: team.employee.id }, orderBy: { createdAt: 'desc' } });
      // createdAt is the row's exact time as UTC ISO (with 'Z'), so browsers in any time zone read it correctly.
      expect(received).toEqual({ id: row.id, createdAt: row.createdAt.toISOString() });
      s.disconnect();
    });

    it("never sends someone else's notification", async () => {
      const mine = await connect(employeeToken);
      const theirs = await connect(colleagueToken);
      const theirEvent = nextEvent(theirs, 800);
      const myEvent = nextEvent(mine);

      await ctx.http().post(`/users/${team.employee.id}/award-xp`).set(bearer(adminToken)).send({ amount: 10, reason: 'Thanks' }).expect(201);

      expect(await myEvent).not.toBeNull();
      expect(await theirEvent).toBeNull();
      mine.disconnect();
      theirs.disconnect();
    });

    it('does not announce a notification whose transaction was rolled back', async () => {
      const s = await connect(employeeToken);
      const event = nextEvent(s, 800);
      await expect(
        ctx.prisma.$transaction(async (tx) => {
          await tx.notification.create({
            data: { userId: team.employee.id, kind: 'system', titleEn: 'x', titleAr: 'x', bodyEn: 'x', bodyAr: 'x' },
          });
          throw new Error('roll back');
        }),
      ).rejects.toThrow('roll back');
      expect(await event).toBeNull();
      s.disconnect();
    });

    it('reaches every open tab of the same user', async () => {
      const tab1 = await connect(employeeToken);
      const tab2 = await connect(employeeToken);
      const [e1, e2] = [nextEvent(tab1), nextEvent(tab2)];
      await ctx.http().post(`/users/${team.employee.id}/award-xp`).set(bearer(adminToken)).send({ amount: 5, reason: 'Again' }).expect(201);
      expect(await e1).not.toBeNull();
      expect(await e2).not.toBeNull();
      tab1.disconnect();
      tab2.disconnect();
    });
  });

  it('NFR4: delivers within 1 second, end to end (action -> recipient browser)', async () => {
    const s = await connect(employeeToken);
    const samples: number[] = [];
    for (let i = 0; i < 30; i++) {
      const event = nextEvent(s);
      const started = performance.now();
      await ctx.http().post(`/users/${team.employee.id}/award-xp`).set(bearer(adminToken)).send({ amount: 1, reason: `Sample ${i}` });
      expect(await event).not.toBeNull();
      samples.push(performance.now() - started);
    }
    s.disconnect();

    const sorted = [...samples].sort((a, b) => a - b);
    const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
    const stats = { samples: sorted.length, p50_ms: pct(50), p95_ms: pct(95), max_ms: sorted.at(-1) as number };
    // Printed so the numbers can go straight into the report's verification chapter.
    console.log(`NFR4 latency (admin awards XP -> employee socket receives event): ${JSON.stringify(
      Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    )}`);
    expect(stats.max_ms).toBeLessThan(1000);
  });
});
