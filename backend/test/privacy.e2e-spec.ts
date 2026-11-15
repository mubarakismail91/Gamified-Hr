import { PrivacyService } from '../src/privacy/privacy.service';
import { researchCode } from '../src/research/research-code';
import { bearer, createDepartment, createTestApp, createUser, login, PASSWORD, resetDatabase, type TestContext } from './support/app';

const DAY = 24 * 60 * 60 * 1000;

/** Item 10 (PDPL): retention policy, right of access, right to destruction, retention cleanup. */
describe('Privacy and data rights (API)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let adminId: string;
  let team: Awaited<ReturnType<typeof createDepartment>>;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    const admin = await createUser(ctx.prisma, 'admin');
    adminId = admin.id;
    adminToken = await login(ctx, admin.email);
    team = await createDepartment(ctx.prisma, 'Research');
  });
  afterAll(() => ctx.app.close());

  it('publishes the retention periods without signing in', async () => {
    const res = await ctx.http().get('/privacy/policy').expect(200);
    expect(res.body).toMatchObject({ notificationsDays: 365, deactivatedAccountsDays: 365, revokedSessionsDays: 30, researchConsentVersion: '2026-11-v1' });
  });

  describe('right of access: download my data', () => {
    it('returns everything held about the person (and nothing secret), and audits it', async () => {
      const token = await login(ctx, team.employee.email);
      const colleagueToken = await login(ctx, team.colleague.email);
      await ctx.http().post('/kudos').set(bearer(colleagueToken)).send({ toUserId: team.employee.id, value: 'service', message: 'Thank you for your help.' }).expect(204);

      const res = await ctx.http().get('/privacy/my-data').set(bearer(token)).expect(200);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="my-data-\d{4}-\d{2}-\d{2}\.json"/);
      expect(res.body.profile).toMatchObject({ id: team.employee.id, email: team.employee.email });
      expect(res.body.kudosReceived[0]).toMatchObject({ message: 'Thank you for your help.' });
      expect(res.body.loginSessions.length).toBeGreaterThan(0);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenHash/);
      expect(await ctx.prisma.auditLog.count({ where: { action: 'privacy.dataExported', actorId: team.employee.id } })).toBe(1);
    });

    it('requires signing in', () => ctx.http().get('/privacy/my-data').expect(401));
  });

  describe('right to destruction: erase', () => {
    it('only admins can erase, and only deactivated accounts', async () => {
      const managerToken = await login(ctx, team.manager.email);
      await ctx.http().post(`/privacy/erase/${team.colleague.id}`).set(bearer(managerToken)).expect(403);
      await ctx.http().post(`/privacy/erase/${team.colleague.id}`).set(bearer(adminToken)).expect(400); // still active
      await ctx.http().post(`/privacy/erase/${adminId}`).set(bearer(adminToken)).expect(400);
    });

    it('anonymises personal data but keeps XP and the audit trail consistent', async () => {
      const person = team.colleague;
      const token = await login(ctx, person.email);
      await ctx.prisma.user.update({ where: { id: person.id }, data: { generation: 'gen_x', staffType: 'academic', totalXp: 250 } });
      await ctx.http().post('/research/consent').set(bearer(token)).expect(201);
      await ctx.prisma.researchResponse.create({ data: { code: researchCode(process.env.RESEARCH_KEY as string, person.id), roundId: (await ctx.prisma.surveyRound.create({ data: { titleEn: 'R', titleAr: 'R', opensAt: new Date(), targetCount: 1 } })).id, answers: {} } });

      await ctx.http().delete(`/users/${person.id}`).set(bearer(adminToken)).expect(200);
      const before = await ctx.prisma.user.findUniqueOrThrow({ where: { id: person.id } });
      expect(before.deactivatedAt).not.toBeNull();

      await ctx.http().post(`/privacy/erase/${person.id}`).set(bearer(adminToken)).expect(201);
      const after = await ctx.prisma.user.findUniqueOrThrow({ where: { id: person.id } });
      expect(after).toMatchObject({ nameEn: 'Former staff member', email: `erased-${person.id}@erased.invalid`, generation: null, staffType: null, totalXp: 250 });
      expect(after.erasedAt).not.toBeNull();

      expect(await ctx.prisma.notification.count({ where: { userId: person.id } })).toBe(0);
      expect(await ctx.prisma.refreshToken.count({ where: { userId: person.id } })).toBe(0);
      expect(await ctx.prisma.researchConsent.count({ where: { userId: person.id } })).toBe(0);
      expect(await ctx.prisma.researchResponse.count()).toBe(0);
      const kudo = await ctx.prisma.kudo.findFirstOrThrow({ where: { fromUserId: person.id } });
      expect(kudo.messageEn).toBe('[removed]');

      const audits = await ctx.prisma.auditLog.findMany({ where: { targetId: person.id } });
      expect(audits.some((a) => a.action === 'user.deactivated')).toBe(true); // the event stays...
      expect(JSON.stringify(audits.map((a) => a.metadata))).not.toContain(person.email); // ...without the email
      expect(audits.some((a) => a.action === 'user.erased')).toBe(true);

      await ctx.http().post('/auth/login').send({ email: person.email, password: PASSWORD }).expect(401);
      await ctx.http().post(`/privacy/erase/${person.id}`).set(bearer(adminToken)).expect(400); // already erased

      const list = await ctx.http().get('/privacy/deactivated').set(bearer(adminToken)).expect(200);
      expect(list.body.find((u: { id: string }) => u.id === person.id)).toMatchObject({ email: null, name: { en: 'Former staff member' } });
    });
  });

  describe('retention cleanup', () => {
    it('deletes old notifications and expired sessions, and anonymises long-deactivated accounts', async () => {
      const old = new Date(Date.now() - 400 * DAY);
      await ctx.prisma.notification.create({
        data: { userId: team.employee.id, kind: 'system', titleEn: 'Old', titleAr: 'Old', bodyEn: 'Old', bodyAr: 'Old', createdAt: old },
      });
      const recent = await ctx.prisma.notification.count({ where: { userId: team.employee.id } });
      await ctx.prisma.refreshToken.create({ data: { userId: team.employee.id, tokenHash: 'expired-token-hash', expiresAt: new Date(Date.now() - DAY) } });
      const gone = await createUser(ctx.prisma, 'employee');
      await ctx.prisma.user.update({ where: { id: gone.id }, data: { isActive: false, deactivatedAt: old } });
      const recentlyGone = await createUser(ctx.prisma, 'employee');
      await ctx.prisma.user.update({ where: { id: recentlyGone.id }, data: { isActive: false, deactivatedAt: new Date() } });

      const res = await ctx.http().post('/privacy/retention/run').set(bearer(adminToken)).expect(201);
      expect(res.body).toMatchObject({ notificationsDeleted: 1, accountsAnonymised: 1 });
      expect(res.body.sessionsDeleted).toBeGreaterThanOrEqual(1);

      expect(await ctx.prisma.notification.count({ where: { userId: team.employee.id } })).toBe(recent - 1);
      expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: gone.id } })).erasedAt).not.toBeNull();
      expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: recentlyGone.id } })).erasedAt).toBeNull();
    });

    it('the scheduled run is recorded in the audit trail as "System"', async () => {
      await ctx.app.get(PrivacyService).runRetention(null);
      const audit = await ctx.http().get('/audit').set(bearer(adminToken)).expect(200);
      const entry = audit.body.find((e: { action: { en: string } }) => e.action.en.startsWith('Retention cleanup'));
      expect(entry.actor).toEqual({ en: 'System', ar: 'النظام' });
    });

    it('only admins can run it on demand', async () => {
      const managerToken = await login(ctx, team.manager.email);
      await ctx.http().post('/privacy/retention/run').set(bearer(managerToken)).expect(403);
    });
  });
});
