import { bearer, createDepartment, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

/**
 * Item 3: optional generation / job-role fields, demographic breakdowns, and
 * group-tagged anonymous survey responses — all behind k = 5.
 */
describe('Demographics (API)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let managerToken: string;
  let team: Awaited<ReturnType<typeof createDepartment>>;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
    team = await createDepartment(ctx.prisma, 'Research');
    managerToken = await login(ctx, team.manager.email);
    await ctx.prisma.user.update({ where: { id: team.employee.id }, data: { generation: 'gen_x', staffType: 'academic' } });
  });

  afterAll(() => ctx.app.close());

  describe('user fields', () => {
    it('an admin can create a user with a generation and job role, or with neither', async () => {
      const withFields = await ctx
        .http()
        .post('/users')
        .set(bearer(adminToken))
        .send({ nameEn: 'Huda', email: 'huda@test.iu.edu.sa', role: 'employee', gender: 'female', generation: 'millennial', staffType: 'administrative' })
        .expect(201);
      expect(withFields.body.user).toMatchObject({ generation: 'millennial', staffType: 'administrative' });

      const without = await ctx
        .http()
        .post('/users')
        .set(bearer(adminToken))
        .send({ nameEn: 'Omar', email: 'omar@test.iu.edu.sa', role: 'employee', gender: 'male' })
        .expect(201);
      expect(without.body.user).toMatchObject({ generation: null, staffType: null });
    });

    it('accepts "prefer not to say", can clear a value, and rejects anything else (e.g. a birth year)', async () => {
      const id = team.colleague.id;
      const set = await ctx.http().patch(`/users/${id}`).set(bearer(adminToken)).send({ generation: 'undisclosed' }).expect(200);
      expect(set.body.generation).toBe('undisclosed');
      const cleared = await ctx.http().patch(`/users/${id}`).set(bearer(adminToken)).send({ generation: null }).expect(200);
      expect(cleared.body.generation).toBeNull();
      await ctx.http().patch(`/users/${id}`).set(bearer(adminToken)).send({ generation: '1985' }).expect(400);
      await ctx.http().patch(`/users/${id}`).set(bearer(adminToken)).send({ staffType: 'student' }).expect(400);
    });

    it('only the admin user list shows them, never a manager roster, a profile or the leaderboard', async () => {
      const adminList = await ctx.http().get('/users').set(bearer(adminToken)).expect(200);
      const tagged = adminList.body.find((u: { id: string }) => u.id === team.employee.id);
      expect(tagged).toMatchObject({ generation: 'gen_x', staffType: 'academic' });

      const managerList = await ctx.http().get('/users').set(bearer(managerToken)).expect(200);
      for (const u of managerList.body) {
        expect(u).not.toHaveProperty('generation');
        expect(u).not.toHaveProperty('staffType');
      }

      const employeeToken = await login(ctx, team.employee.email);
      const me = await ctx.http().get('/auth/me').set(bearer(employeeToken)).expect(200);
      expect(JSON.stringify(me.body)).not.toMatch(/generation|staffType/);
      const board = await ctx.http().get('/leaderboard?scope=uni').set(bearer(employeeToken)).expect(200);
      expect(JSON.stringify(board.body)).not.toMatch(/generation|staffType/);
      const profile = await ctx.http().get(`/profiles/${team.employee.id}`).set(bearer(managerToken));
      expect(JSON.stringify(profile.body)).not.toMatch(/generation|staffType/);
    });
  });

  describe('admin demographics tab', () => {
    it('counts each group, keeping "prefer not to say" and "not recorded" apart', async () => {
      const res = await ctx.http().get('/analytics/demographics').set(bearer(adminToken)).expect(200);
      const gen = Object.fromEntries(res.body.byGeneration.map((r: { key: { en: string }; value: number }) => [r.key.en, r.value]));
      expect(gen['Gen X (1965–1980)']).toBe(1);
      expect(gen['Millennials (1981–1996)']).toBe(1);
      expect(gen['Not recorded']).toBeGreaterThan(0);
      expect(res.body.minGroupSize).toBe(5);
    });

    it('hides average XP and participation for groups smaller than 5', async () => {
      const res = await ctx.http().get('/analytics/demographics').set(bearer(adminToken)).expect(200);
      const genX = res.body.engagement.generation.find((r: { key: { en: string } }) => r.key.en.startsWith('Gen X'));
      expect(genX).toEqual({ key: expect.any(Object), headcount: 1, avgXp: null, participationRate: null, suppressed: true });
    });

    it('is admin only', () => ctx.http().get('/analytics/demographics').set(bearer(managerToken)).expect(403));
  });

  describe('survey group tags', () => {
    let roundId: string;

    /** 11 respondents: 6 Gen X academics, 2 Millennial administrators, 3 who haven't stated either. */
    beforeAll(async () => {
      const respondents = [
        ...Array.from({ length: 6 }, () => ({ generation: 'gen_x' as const, staffType: 'academic' as const, value: 4 })),
        ...Array.from({ length: 2 }, () => ({ generation: 'millennial' as const, staffType: 'administrative' as const, value: 2 })),
        { generation: 'undisclosed' as const, staffType: 'undisclosed' as const, value: 3 },
        { generation: null, staffType: null, value: 3 },
        { generation: null, staffType: 'academic' as const, value: 3 },
      ];
      const round = await ctx
        .http()
        .post('/surveys')
        .set(bearer(adminToken))
        .send({ titleEn: 'Group pulse', opensAt: new Date(Date.now() - 60_000).toISOString() })
        .expect(201);
      roundId = round.body.id;

      for (const r of respondents) {
        const user = await createUser(ctx.prisma, 'employee', { generation: r.generation, staffType: r.staffType });
        const token = await login(ctx, user.email);
        const active = await ctx.http().get('/surveys/active').set(bearer(token)).expect(200);
        const questions = active.body.find((x: { id: string }) => x.id === roundId).questions as { id: string }[];
        await ctx
          .http()
          .post(`/surveys/${roundId}/responses`)
          .set(bearer(token))
          .send({ answers: Object.fromEntries(questions.map((q) => [q.id, r.value])) })
          .expect(204);
      }
    });

    it('stores the group tag but no user, no time, and a random id', async () => {
      const rows = await ctx.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "SurveyResponse"`;
      expect(rows).toHaveLength(11);
      for (const r of rows) expect(r.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      const columns = await ctx.prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'SurveyResponse' ORDER BY column_name`;
      expect(columns.map((c) => c.column_name)).toEqual(['answers', 'generation', 'id', 'roundId', 'staffType']);

      const tags = await ctx.prisma.surveyResponse.groupBy({ by: ['generation'], _count: true });
      const byGen = Object.fromEntries(tags.map((t) => [String(t.generation), t._count]));
      expect(byGen).toEqual({ gen_x: 6, millennial: 2, null: 3 }); // 'undisclosed' is stored as null
    });

    it('by generation: shows Gen X, hides the two small groups', async () => {
      const res = await ctx
        .http()
        .get(`/surveys/scores/by-group?dimension=generation&roundId=${roundId}`)
        .set(bearer(adminToken))
        .expect(200);
      const groups = Object.fromEntries(res.body.groups.map((g: { key: string }) => [g.key, g]));
      expect(res.body.respondentCount).toBe(11);
      expect(groups.gen_x).toMatchObject({ respondents: 6, suppressed: false });
      expect(groups.gen_x.scores.map((s: { score: number }) => s.score)).toEqual([4, 4, 4]);
      expect(groups.millennial).toMatchObject({ respondents: null, suppressed: true });
      expect(groups.not_stated).toMatchObject({ respondents: null, suppressed: true });
      expect(groups.gen_z).toMatchObject({ respondents: 0, suppressed: false });
    });

    it('by job role: shows academic staff, hides the two small groups', async () => {
      // academic 7, administrative 2, not stated 2. (The 'only one small group' rule is covered in sdt-scoring.spec.ts.)
      const res = await ctx
        .http()
        .get(`/surveys/scores/by-group?dimension=staffType&roundId=${roundId}`)
        .set(bearer(adminToken))
        .expect(200);
      const groups = Object.fromEntries(res.body.groups.map((g: { key: string }) => [g.key, g]));
      expect(groups.academic).toMatchObject({ respondents: 7, suppressed: false });
      expect(groups.administrative.suppressed).toBe(true);
      expect(groups.not_stated.suppressed).toBe(true);
    });

    it('validates the dimension and is admin only', async () => {
      await ctx.http().get(`/surveys/scores/by-group?dimension=department&roundId=${roundId}`).set(bearer(adminToken)).expect(400);
      await ctx.http().get(`/surveys/scores/by-group?dimension=generation`).set(bearer(managerToken)).expect(403);
    });
  });
});
