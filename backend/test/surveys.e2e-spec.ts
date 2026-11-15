import { bearer, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

/** SDT pulse survey: anonymity by construction, and k-anonymity (k = 5) on the results. */
describe('SDT pulse survey (API)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let employees: { id: string; token: string }[];
  let roundId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    const admin = await createUser(ctx.prisma, 'admin');
    adminToken = await login(ctx, admin.email);
    employees = [];
    for (let i = 0; i < 6; i++) {
      const e = await createUser(ctx.prisma, 'employee');
      employees.push({ id: e.id, token: await login(ctx, e.email) });
    }

    const round = await ctx
      .http()
      .post('/surveys')
      .set(bearer(adminToken))
      .send({ titleEn: 'November pulse', opensAt: new Date(Date.now() - 60_000).toISOString() })
      .expect(201);
    roundId = round.body.id;
    expect(round.body.target).toBe(6);
  });

  afterAll(() => ctx.app.close());

  const STATUS_OK = 204;

  async function answer(token: string, value: number) {
    const active = await ctx.http().get('/surveys/active').set(bearer(token)).expect(200);
    const round = active.body.find((r: { id: string }) => r.id === roundId);
    const answers = Object.fromEntries(round.questions.map((q: { id: string }) => [q.id, value]));
    return ctx.http().post(`/surveys/${roundId}/responses`).set(bearer(token)).send({ answers });
  }

  const scores = () => ctx.http().get(`/surveys/scores?roundId=${roundId}`).set(bearer(adminToken)).expect(200);

  it('hides the results while fewer than 5 people have answered', async () => {
    for (const [i, e] of employees.slice(0, 4).entries()) {
      expect((await answer(e.token, i + 1)).status).toBe(STATUS_OK);
    }
    const res = await scores();
    expect(res.body).toEqual({ scores: [], respondentCount: 4, suppressed: true });
  });

  it('shows per-need averages once the 5th person answers', async () => {
    expect((await answer(employees[4].token, 5)).status).toBe(STATUS_OK);
    const res = await scores();
    expect(res.body.suppressed).toBe(false);
    expect(res.body.respondentCount).toBe(5);
    // Answers 1, 2, 3, 4, 5 on every item -> 3.0 for each need.
    expect(res.body.scores.map((s: { score: number }) => s.score)).toEqual([3, 3, 3]);
  });

  it('stores no user reference with the answers', async () => {
    const columns = await ctx.prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'SurveyResponse'`;
    const names = columns.map((c) => c.column_name.toLowerCase());
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((n) => n.includes('user'))).toBe(false);
  });

  it('lets each person answer a round only once, and removes it from their list', async () => {
    await ctx.http().post(`/surveys/${roundId}/responses`).set(bearer(employees[0].token)).send({ answers: {} }).expect(400);
    const active = await ctx.http().get('/surveys/active').set(bearer(employees[0].token)).expect(200);
    expect(active.body.find((r: { id: string }) => r.id === roundId)).toBeUndefined();
  });

  it('gives no XP for answering (removed after the midterm ethics review)', async () => {
    const xp = await ctx.prisma.user.findMany({ where: { id: { in: employees.map((e) => e.id) } }, select: { totalXp: true } });
    expect(xp.every((u) => u.totalXp === 0)).toBe(true);
  });
});
