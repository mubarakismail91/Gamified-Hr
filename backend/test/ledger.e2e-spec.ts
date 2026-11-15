import { randomUUID } from 'crypto';
import { hashOf } from '../src/ledger/xp-hash';
import { bearer, createDepartment, createPendingSubmission, createQuest, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

/** Item 11: the XP ledger — idempotency, safe deductions, concurrency, append-only rules, hash chains. */
describe('XP ledger (API)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let team: Awaited<ReturnType<typeof createDepartment>>;

  const award = (userId: string, amount: number, key?: string) => {
    const req = ctx.http().post(`/users/${userId}/award-xp`).set(bearer(adminToken));
    return (key ? req.set('Idempotency-Key', key) : req).send({ amount, reason: 'test' });
  };
  const rows = (userId: string) => ctx.prisma.xpTransaction.findMany({ where: { userId }, orderBy: { seq: 'asc' } });
  const xpOf = async (id: string) => (await ctx.prisma.user.findUniqueOrThrow({ where: { id } })).totalXp;
  const verify = async () => (await ctx.http().get('/ledger/verify').set(bearer(adminToken)).expect(200)).body;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
    team = await createDepartment(ctx.prisma, 'Research');
  });
  afterAll(() => ctx.app.close());

  it('records a quest approval and a Kudos as chained, hash-valid ledger rows', async () => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id, xp: 50 });
    const assignment = await createPendingSubmission(ctx.prisma, quest.id, team.employee.id);
    const managerToken = await login(ctx, team.manager.email);
    await ctx.http().post(`/assignments/${assignment.id}/approve`).set(bearer(managerToken)).expect(201);
    const colleagueToken = await login(ctx, team.colleague.email);
    await ctx.http().post('/kudos').set(bearer(colleagueToken)).send({ toUserId: team.employee.id, value: 'service', message: 'Thanks for all your help.' }).expect(204);

    const [first, second] = await rows(team.employee.id);
    expect(first).toMatchObject({ seq: 1, amount: 50, balanceAfter: 50, source: 'quest_approved', idempotencyKey: `quest:${assignment.id}`, prevHash: '0'.repeat(64) });
    expect(second).toMatchObject({ seq: 2, amount: 15, balanceAfter: 65, source: 'kudos_received', prevHash: first.hash });
    expect(hashOf(first)).toBe(first.hash);
    expect(await xpOf(team.employee.id)).toBe(65);
    expect((await verify()).ok).toBe(true);
  });

  it("the Node.js hash matches the database's xp_hash() used by the backfill", async () => {
    const [r] = await rows(team.employee.id);
    const [{ h }] = await ctx.prisma.$queryRaw<{ h: string }[]>`
      SELECT xp_hash(${r.prevHash}, ${r.userId}, ${r.seq}, ${r.amount}, ${r.balanceAfter}, ${r.source}::text,
                     ${r.refType}, ${r.refId}, ${r.idempotencyKey}, ${r.actorId}, ${r.createdAt}::timestamp) AS h`;
    expect(h).toBe(r.hash);
  });

  describe('admin awards', () => {
    it('the same Idempotency-Key awards once, even if sent again or twice at the same moment', async () => {
      const person = await createUser(ctx.prisma, 'employee');
      const key = randomUUID();
      const first = await award(person.id, 40, key).expect(201);
      const again = await award(person.id, 40, key).expect(201);
      expect(again.body.totalXp).toBe(first.body.totalXp);

      const key2 = randomUUID();
      await Promise.all([award(person.id, 25, key2), award(person.id, 25, key2), award(person.id, 25, key2)]);

      expect(await xpOf(person.id)).toBe(65);
      expect((await rows(person.id)).map((r) => r.amount)).toEqual([40, 25]);
      expect(await ctx.prisma.notification.count({ where: { userId: person.id } })).toBe(2);
    });

    it('rejects a malformed Idempotency-Key', () => award(team.colleague.id, 5, 'bad key!').expect(400));

    it('a deduction never goes below 0, and records only what was actually taken', async () => {
      const person = await createUser(ctx.prisma, 'employee');
      await award(person.id, 30).expect(201);
      const res = await award(person.id, -100).expect(201);
      expect(res.body.totalXp).toBe(0);

      expect((await rows(person.id)).map((r) => [r.amount, r.balanceAfter])).toEqual([[30, 30], [-30, 0]]);
      const feed = await ctx.prisma.activityLog.findMany({ where: { userId: person.id }, orderBy: { createdAt: 'asc' } });
      expect(feed.map((a) => a.xpDelta)).toEqual([30, -30]); // the feed agrees with the ledger
      expect(await ctx.prisma.notification.count({ where: { userId: person.id, titleEn: '-30 XP' } })).toBe(1);

      await award(person.id, -10).expect(201); // nothing left to take: nothing recorded
      expect(await rows(person.id)).toHaveLength(2);
    });
  });

  it('concurrent XP for the same person is never lost (the old read-then-write bug)', async () => {
    const person = await createUser(ctx.prisma, 'employee');
    await Promise.all(Array.from({ length: 10 }, () => award(person.id, 10)));
    expect(await xpOf(person.id)).toBe(100);
    expect((await rows(person.id)).map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect((await verify()).ok).toBe(true);
  });

  describe('append-only, enforced by the database', () => {
    it('refuses to edit or delete a ledger row', async () => {
      const [r] = await rows(team.employee.id);
      await expect(ctx.prisma.xpTransaction.update({ where: { id: r.id }, data: { amount: 5000 } })).rejects.toThrow(/append-only/);
      await expect(ctx.prisma.xpTransaction.delete({ where: { id: r.id } })).rejects.toThrow(/append-only/);
    });

    it('refuses to delete or rewrite the audit trail, but allows removing personal details', async () => {
      const entry = await ctx.prisma.auditLog.create({
        data: { actorId: null, action: 'test.entry', targetType: 'User', metadata: { email: 'x@test.iu.edu.sa', amount: 5 } },
      });
      await expect(ctx.prisma.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow(/cannot be deleted/);
      await expect(ctx.prisma.auditLog.update({ where: { id: entry.id }, data: { action: 'test.changed' } })).rejects.toThrow(/only have personal details removed/);
      await expect(ctx.prisma.auditLog.update({ where: { id: entry.id }, data: { metadata: { amount: 9999 } } })).rejects.toThrow(/only have personal details removed/);
      await ctx.prisma.auditLog.update({ where: { id: entry.id }, data: { metadata: { amount: 5 } } }); // email removed: allowed
    });
  });

  it('the integrity check catches a row edited behind the system’s back', async () => {
    const [r] = await rows(team.employee.id);
    // Someone with direct database-owner access switches the protection off and edits a row.
    await ctx.prisma.$executeRawUnsafe('ALTER TABLE "XpTransaction" DISABLE TRIGGER xp_transaction_no_update_delete');
    await ctx.prisma.$executeRaw`UPDATE "XpTransaction" SET amount = 500 WHERE id = ${r.id}`;
    await ctx.prisma.$executeRawUnsafe('ALTER TABLE "XpTransaction" ENABLE TRIGGER xp_transaction_no_update_delete');

    const result = await verify();
    expect(result.ok).toBe(false);
    const issues = result.problems.filter((p: { userId: string }) => p.userId === team.employee.id).map((p: { issue: string }) => p.issue);
    expect(issues.join(' | ')).toMatch(/do not match its hash/);
    expect(issues.join(' | ')).toMatch(/running balance/);
    expect(await ctx.prisma.auditLog.count({ where: { action: 'ledger.verified' } })).toBeGreaterThan(0);
  });

  it('only admins can verify or read a ledger', async () => {
    const managerToken = await login(ctx, team.manager.email);
    await ctx.http().get('/ledger/verify').set(bearer(managerToken)).expect(403);
    const history = await ctx.http().get(`/ledger/users/${team.employee.id}`).set(bearer(adminToken)).expect(200);
    expect(history.body.length).toBeGreaterThan(0);
  });
});
