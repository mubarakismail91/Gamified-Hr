import './support/no-research-key'; // must stay the first import
import { bearer, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

/** Item 4: with no RESEARCH_KEY configured, the research track is off but anonymous aggregates still work. */
describe('Research track without RESEARCH_KEY (API)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });
  afterAll(() => ctx.app.close());

  it('switches the research track off, but anonymous aggregates still work', async () => {
    const employeeToken = await login(ctx, (await createUser(ctx.prisma, 'employee')).email);
    const adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);

    const mine = await ctx.http().get('/research/consent').set(bearer(employeeToken)).expect(200);
    expect(mine.body.available).toBe(false);
    await ctx.http().post('/research/consent').set(bearer(employeeToken)).expect(503);
    await ctx.http().get('/research/export/participants').set(bearer(adminToken)).expect(503);
    await ctx.http().get('/research/export/aggregates').set(bearer(adminToken)).expect(200);
    const status = await ctx.http().get('/research/status').set(bearer(adminToken)).expect(200);
    expect(status.body.configured).toBe(false);
  });
});
