import { researchCode } from '../src/research/research-code';
import { bearer, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

const KEY = () => process.env.RESEARCH_KEY as string;

/** Item 4: opt-in research track (Track B) with pseudonymised export, plus anonymous aggregates (Track A). */
describe('Research track and exports (API)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let roundId: string;
  let volunteer: { id: string; email: string; nameEn: string; token: string };
  let others: { id: string; token: string }[];

  async function answer(token: string, value: number) {
    const active = await ctx.http().get('/surveys/active').set(bearer(token)).expect(200);
    const questions = active.body.find((r: { id: string }) => r.id === roundId).questions as { id: string }[];
    await ctx
      .http()
      .post(`/surveys/${roundId}/responses`)
      .set(bearer(token))
      .send({ answers: Object.fromEntries(questions.map((q) => [q.id, value])) })
      .expect(204);
  }

  const csvLines = (text: string) => text.replace(/^﻿/, '').trim().split('\r\n');

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);

    const v = await createUser(ctx.prisma, 'employee', { generation: 'millennial', staffType: 'academic', totalXp: 340 });
    volunteer = { id: v.id, email: v.email, nameEn: v.nameEn, token: await login(ctx, v.email) };
    others = [];
    for (let i = 0; i < 5; i++) {
      const u = await createUser(ctx.prisma, 'employee');
      others.push({ id: u.id, token: await login(ctx, u.email) });
    }

    const round = await ctx
      .http()
      .post('/surveys')
      .set(bearer(adminToken))
      .send({ titleEn: 'Research pulse', opensAt: new Date(Date.now() - 60_000).toISOString() })
      .expect(201);
    roundId = round.body.id;
  });

  afterAll(() => ctx.app.close());

  it('an employee starts outside the study', async () => {
    const res = await ctx.http().get('/research/consent').set(bearer(volunteer.token)).expect(200);
    expect(res.body).toMatchObject({ available: true, consented: false, consentedAt: null });
  });

  it('opting in is recorded with the consent version, and audited', async () => {
    const res = await ctx.http().post('/research/consent').set(bearer(volunteer.token)).expect(201);
    expect(res.body).toMatchObject({ consented: true, consentVersion: '2026-11-v1' });
    expect(await ctx.prisma.auditLog.count({ where: { action: 'research.consentGiven', actorId: volunteer.id } })).toBe(1);
  });

  it("a consenting employee's answers are ALSO stored under their research code; others' are not", async () => {
    await answer(volunteer.token, 4);
    for (const o of others) await answer(o.token, 2);

    expect(await ctx.prisma.surveyResponse.count({ where: { roundId } })).toBe(6); // anonymous copies: everyone
    const linked = await ctx.prisma.researchResponse.findMany();
    expect(linked).toHaveLength(1);
    expect(linked[0].code).toBe(researchCode(KEY(), volunteer.id));

    const columns = await ctx.prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'ResearchResponse' ORDER BY column_name`;
    expect(columns.map((c) => c.column_name)).toEqual(['answers', 'code', 'id', 'roundId']); // no user id, no time
  });

  it('participants export: one pseudonymised row per participant and round, nothing identifying', async () => {
    const res = await ctx.http().get('/research/export/participants').set(bearer(adminToken)).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="research-track-participants-\d{4}-\d{2}-\d{2}\.csv"/);

    const lines = csvLines(res.text);
    expect(lines[0]).toBe(
      'research_code,consented_on,consent_version,generation,staff_type,total_xp,quests_accepted,quests_completed,kudos_sent,kudos_received,badges_earned,active_days_last_90,round_id,round_title,round_opens_on,autonomy,competence,relatedness',
    );
    expect(lines).toHaveLength(2);
    const cells = lines[1].split(',');
    expect(cells[0]).toBe(researchCode(KEY(), volunteer.id));
    expect(cells.slice(3, 6)).toEqual(['millennial', 'academic', '340']);
    expect(cells.slice(-3)).toEqual(['4', '4', '4']);

    for (const secret of [volunteer.id, volunteer.email, volunteer.nameEn, ...others.map((o) => o.id)]) {
      expect(res.text).not.toContain(secret);
    }
    const audit = await ctx.prisma.auditLog.findFirst({ where: { action: 'research.exported' }, orderBy: { createdAt: 'desc' } });
    expect(audit?.metadata).toMatchObject({ dataset: 'participants', participants: 1, rows: 1 });
  });

  it('aggregates export: overall and per-group averages with the same k = 5 rules', async () => {
    const res = await ctx.http().get('/research/export/aggregates').set(bearer(adminToken)).expect(200);
    const lines = csvLines(res.text);
    expect(lines[0]).toBe('round_id,round_title,opens_on,closes_on,breakdown,group,respondents,suppressed,autonomy,competence,relatedness');

    const rows = lines.slice(1).map((l) => l.split(','));
    const overall = rows.find((r) => r[4] === 'overall');
    expect(overall?.slice(6)).toEqual(['6', 'false', '2.3', '2.3', '2.3']); // (4 + 2*5) / 6

    // 1 Millennial and 5 "not stated": Millennial is hidden, so "not stated" is hidden too (complementary).
    const gen = Object.fromEntries(rows.filter((r) => r[4] === 'generation').map((r) => [r[5], r]));
    expect(gen.millennial.slice(6, 8)).toEqual(['', 'true']);
    expect(gen.not_stated.slice(6, 8)).toEqual(['', 'true']);
    expect(await ctx.prisma.auditLog.count({ where: { action: 'research.exported' } })).toBe(2);
  });

  it('lets the browser read the file name cross-origin, and starts the file with a UTF-8 BOM for Excel', async () => {
    const res = await ctx
      .http()
      .get('/research/export/aggregates')
      .set(bearer(adminToken))
      .set('Origin', 'http://localhost:5173')
      .buffer(true)
      .parse((r, done) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(String(res.headers['access-control-expose-headers'])).toMatch(/Content-Disposition/i);
    expect([...(res.body as Buffer).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('only admins can see the status or export; only employees can consent', async () => {
    await ctx.http().get('/research/export/participants').set(bearer(volunteer.token)).expect(403);
    await ctx.http().get('/research/export/aggregates').set(bearer(volunteer.token)).expect(403);
    await ctx.http().get('/research/status').set(bearer(volunteer.token)).expect(403);
    await ctx.http().post('/research/consent').set(bearer(adminToken)).expect(403);
    const status = await ctx.http().get('/research/status').set(bearer(adminToken)).expect(200);
    expect(status.body).toEqual({ configured: true, participants: 1, consentVersion: '2026-11-v1' });
  });

  it('withdrawing deletes the consent and every linked answer, but not the anonymous answers', async () => {
    const res = await ctx.http().delete('/research/consent').set(bearer(volunteer.token)).expect(200);
    expect(res.body.consented).toBe(false);
    expect(await ctx.prisma.researchResponse.count()).toBe(0);
    expect(await ctx.prisma.researchConsent.count()).toBe(0);
    expect(await ctx.prisma.surveyResponse.count({ where: { roundId } })).toBe(6);

    const audit = await ctx.prisma.auditLog.findFirst({ where: { action: 'research.consentWithdrawn' } });
    expect(audit?.metadata).toMatchObject({ deletedResponses: 1 });

    const exported = await ctx.http().get('/research/export/participants').set(bearer(adminToken)).expect(200);
    expect(csvLines(exported.text)).toHaveLength(1); // header only
  });
});
