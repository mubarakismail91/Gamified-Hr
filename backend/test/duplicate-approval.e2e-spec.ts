import {
  bearer,
  createDepartment,
  createPendingSubmission,
  createQuest,
  createTestApp,
  createUser,
  login,
  resetDatabase,
  type TestContext,
} from './support/app';

/**
 * Midterm review: "prevent duplicate point awards". Two approvals of the same
 * submission arriving at the same moment (a double-click, or the manager and
 * an admin at once) must award the XP only once.
 */
describe('Duplicate approval (API)', () => {
  let ctx: TestContext;
  let team: Awaited<ReturnType<typeof createDepartment>>;
  let managerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    team = await createDepartment(ctx.prisma, 'Research');
    managerToken = await login(ctx, team.manager.email);
    adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
  });

  afterAll(() => ctx.app.close());

  it.each([
    ['the same manager double-clicks', () => [managerToken, managerToken]],
    ['the manager and an admin approve at once', () => [managerToken, adminToken]],
  ])('awards XP once when %s', async (_label, tokensFor) => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id, xp: 100 });
    const assignment = await createPendingSubmission(ctx.prisma, quest.id, team.employee.id);
    const before = (await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp;

    const results = await Promise.all(
      tokensFor().map((token) => ctx.http().post(`/assignments/${assignment.id}/approve`).set(bearer(token))),
    );

    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    const after = (await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp;
    expect(after - before).toBe(100);
    expect(await ctx.prisma.activityLog.count({ where: { refId: quest.id, kind: 'quest' } })).toBe(1);
    expect(await ctx.prisma.notification.count({ where: { userId: team.employee.id, kind: 'xp', titleEn: '+100 XP earned' } })).toBe(
      before === 0 ? 1 : 2,
    );
  });

  it('cannot approve and reject the same submission at once', async () => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id, xp: 60 });
    const assignment = await createPendingSubmission(ctx.prisma, quest.id, team.employee.id);
    const before = (await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp;

    const [approve, reject] = await Promise.all([
      ctx.http().post(`/assignments/${assignment.id}/approve`).set(bearer(managerToken)),
      ctx.http().post(`/assignments/${assignment.id}/reject`).set(bearer(adminToken)).send({ note: 'Missing file' }),
    ]);

    // Exactly one wins, and the database agrees with whichever it was.
    expect([approve.status, reject.status].sort()).toEqual([201, 400]);
    const final = await ctx.prisma.questAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    const xpGained = (await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp - before;
    if (approve.status === 201) {
      expect(final.status).toBe('completed');
      expect(xpGained).toBe(60);
    } else {
      expect(final.status).toBe('accepted');
      expect(xpGained).toBe(0);
    }
  });
});
