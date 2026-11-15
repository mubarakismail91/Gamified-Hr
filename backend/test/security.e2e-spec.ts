import { bearer, createTestApp, createUser, login, PASSWORD, resetDatabase, type TestContext } from './support/app';

/** Item 10: security headers, CSRF origin check, rate limiting and the password policy. */
describe('Security hardening (API)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });
  afterAll(() => ctx.app.close());

  it('sends security headers on every response', async () => {
    const res = await ctx.http().post('/auth/login').send({ email: 'nobody@test.iu.edu.sa', password: 'x' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'none'/);
    expect(res.headers['strict-transport-security']).toMatch(/max-age=/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  describe('CSRF: cookie routes only accept the real frontend origin', () => {
    it('refuses /auth/refresh and /auth/logout from another site', async () => {
      await ctx.http().post('/auth/refresh').set('Origin', 'https://evil.example').expect(403);
      await ctx.http().post('/auth/logout').set('Origin', 'https://evil.example').expect(403);
    });

    it('lets the frontend origin (and non-browser clients) through to the normal checks', async () => {
      await ctx.http().post('/auth/refresh').set('Origin', 'http://localhost:5173').expect(401); // no cookie
      await ctx.http().post('/auth/refresh').expect(401);
    });
  });

  describe('rate limiting', () => {
    afterEach(() => {
      process.env.LOGIN_ATTEMPTS_PER_15_MIN = '100000';
      process.env.RATE_LIMIT_PER_MINUTE = '100000';
    });

    it('stops password guessing for one account, without blocking others on the same network', async () => {
      process.env.LOGIN_ATTEMPTS_PER_15_MIN = '3';
      const target = await createUser(ctx.prisma, 'employee');
      for (let i = 0; i < 3; i++) {
        await ctx.http().post('/auth/login').send({ email: target.email, password: `guess-${i}` }).expect(401);
      }
      const blocked = await ctx.http().post('/auth/login').send({ email: target.email, password: PASSWORD }).expect(429);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);

      // A colleague behind the same IP can still sign in.
      const colleague = await createUser(ctx.prisma, 'employee');
      await ctx.http().post('/auth/login').send({ email: colleague.email, password: PASSWORD }).expect(200);
    });

    it('limits any client to RATE_LIMIT_PER_MINUTE requests a minute', async () => {
      const token = await login(ctx, (await createUser(ctx.prisma, 'employee')).email);
      process.env.RATE_LIMIT_PER_MINUTE = '5';
      const statuses: number[] = [];
      for (let i = 0; i < 8; i++) statuses.push((await ctx.http().get('/notifications/mine').set(bearer(token))).status);
      expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
    });
  });

  describe('changing a password', () => {
    it('enforces the policy and signs out other sessions', async () => {
      const user = await createUser(ctx.prisma, 'employee');
      const token = await login(ctx, user.email);
      await login(ctx, user.email); // a second session (e.g. another browser)

      await ctx.http().patch('/auth/password').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: 'short' }).expect(400);
      await ctx.http().patch('/auth/password').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: 'Password123456' }).expect(400);
      await ctx.http().patch('/auth/password').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: PASSWORD }).expect(400);
      await ctx.http().patch('/auth/password').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: 'green dates at sunset 77' }).expect(204);

      expect(await ctx.prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
      await ctx.http().post('/auth/login').send({ email: user.email, password: 'green dates at sunset 77' }).expect(200);
    });
  });
});
