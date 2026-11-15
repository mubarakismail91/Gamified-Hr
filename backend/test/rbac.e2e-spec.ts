import { bearer, createDepartment, createPendingSubmission, createQuest, createTestApp, createUser, login, resetDatabase, PASSWORD, type TestContext } from './support/app';

/**
 * Role-based access control. The first block automates the manual checks in
 * Table 6.1 of the midterm report; the rest cover department scoping.
 */
describe('Access control (API)', () => {
  let ctx: TestContext;
  let tokens: { admin: string; manager: string; employee: string; otherManager: string };
  let ids: { employee: string; colleague: string; otherEmployee: string; otherDept: string };

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    const admin = await createUser(ctx.prisma, 'admin');
    const research = await createDepartment(ctx.prisma, 'Research');
    const finance = await createDepartment(ctx.prisma, 'Finance');
    tokens = {
      admin: await login(ctx, admin.email),
      manager: await login(ctx, research.manager.email),
      employee: await login(ctx, research.employee.email),
      otherManager: await login(ctx, finance.manager.email),
    };
    ids = {
      employee: research.employee.id,
      colleague: research.colleague.id,
      otherEmployee: finance.employee.id,
      otherDept: finance.dept.id,
    };
  });

  afterAll(() => ctx.app.close());

  describe('midterm Table 6.1', () => {
    it('list users without a token -> 401', () => ctx.http().get('/users').expect(401));

    it('employee lists users -> 403', () => ctx.http().get('/users').set(bearer(tokens.employee)).expect(403));

    it('manager creates a user -> 403', () =>
      ctx
        .http()
        .post('/users')
        .set(bearer(tokens.manager))
        .send({ nameEn: 'New', email: 'new@test.iu.edu.sa', role: 'employee', gender: 'male' })
        .expect(403));

    it('employee opens the approvals queue -> 403', () =>
      ctx.http().get('/assignments/pending').set(bearer(tokens.employee)).expect(403));

    it('employee creates a quest -> 403', () =>
      ctx
        .http()
        .post('/quests')
        .set(bearer(tokens.employee))
        .send({ titleEn: 'Mine', cadence: 'daily', xp: 50 })
        .expect(403));

    it('manager reads survey rounds (admin only) -> 403', () =>
      ctx.http().get('/surveys').set(bearer(tokens.manager)).expect(403));

    it('administrator reads SDT scores -> 200, suppressed below 5 respondents', async () => {
      const res = await ctx.http().get('/surveys/scores').set(bearer(tokens.admin)).expect(200);
      expect(res.body.suppressed).toBe(true);
    });

    it('employee sends Kudos to themselves -> 400', () =>
      ctx
        .http()
        .post('/kudos')
        .set(bearer(tokens.employee))
        .send({ toUserId: ids.employee, value: 'excellence', message: 'Great job, me!' })
        .expect(400));

    it('login with an extra, unknown field -> 400', async () => {
      const admin = await ctx.prisma.user.findFirstOrThrow({ where: { role: 'admin' } });
      await ctx.http().post('/auth/login').send({ email: admin.email, password: PASSWORD, role: 'admin' }).expect(400);
    });

    it('login with a wrong password -> 401', async () => {
      const admin = await ctx.prisma.user.findFirstOrThrow({ where: { role: 'admin' } });
      await ctx.http().post('/auth/login').send({ email: admin.email, password: 'wrong-password' }).expect(401);
    });
  });

  describe('more role checks', () => {
    it('rejects a forged/invalid token -> 401', () =>
      ctx.http().get('/auth/me').set(bearer('not-a-real-token')).expect(401));

    it('employee reads the audit trail -> 403; admin -> 200', async () => {
      await ctx.http().get('/audit').set(bearer(tokens.employee)).expect(403);
      await ctx.http().get('/audit').set(bearer(tokens.admin)).expect(200);
    });

    it('manager awards XP (admin only) -> 403', () =>
      ctx.http().post(`/users/${ids.employee}/award-xp`).set(bearer(tokens.manager)).send({ amount: 100, reason: 'x' }).expect(403));

    it('admin cannot answer a survey (employees only) -> 403', () =>
      ctx.http().get('/surveys/active').set(bearer(tokens.admin)).expect(403));

    it('employee can send Kudos to a colleague -> 204, and it is saved', async () => {
      await ctx
        .http()
        .post('/kudos')
        .set(bearer(tokens.employee))
        .send({ toUserId: ids.colleague, value: 'collaboration', message: 'Thanks for the help today.' })
        .expect(204);
      expect(await ctx.prisma.kudo.count({ where: { fromUserId: ids.employee, toUserId: ids.colleague } })).toBe(1);
    });
  });

  describe('department scoping', () => {
    it("a manager's quest is always scoped to their own department, whatever they send", async () => {
      const res = await ctx
        .http()
        .post('/quests')
        .set(bearer(tokens.manager))
        .send({ titleEn: 'Scoped quest', cadence: 'daily', xp: 20, status: 'published', departmentId: ids.otherDept })
        .expect(201);
      const quest = await ctx.prisma.quest.findUniqueOrThrow({ where: { id: res.body.id } });
      const research = await ctx.prisma.department.findFirstOrThrow({ where: { nameEn: 'Research' } });
      expect(quest.departmentId).toBe(research.id);
    });

    it("an employee cannot accept another department's quest -> 403", async () => {
      const res = await ctx
        .http()
        .post('/quests')
        .set(bearer(tokens.otherManager))
        .send({ titleEn: 'Finance only', cadence: 'daily', xp: 20, status: 'published' })
        .expect(201);
      await ctx.http().post('/assignments').set(bearer(tokens.employee)).send({ questId: res.body.id }).expect(403);
    });

    it("a manager cannot approve another department's submission -> 403", async () => {
      const quest = await createQuest(ctx.prisma, { createdById: ids.otherEmployee, departmentId: ids.otherDept, xp: 30 });
      const assignment = await createPendingSubmission(ctx.prisma, quest.id, ids.otherEmployee);

      await ctx.http().post(`/assignments/${assignment.id}/approve`).set(bearer(tokens.manager)).expect(403);
      const employee = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ids.otherEmployee } });
      expect(employee.totalXp).toBe(0);
    });
  });
});
