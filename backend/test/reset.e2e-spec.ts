import { execFileSync } from 'child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { PrismaClient } from '@prisma/client';
import { resetToBaseline } from '../prisma/reset';
import { bearer, createDepartment, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

/** Item 13: resetting to a clean, pilot-ready baseline. Runs against the TEST database only. */
describe('Reset to pilot baseline', () => {
  let ctx: TestContext;
  const uploadDir = process.env.UPLOAD_DIR as string;

  beforeAll(async () => {
    process.env.SEED_ADMIN_EMAIL = 'pilot.admin@test.iu.edu.sa';
    process.env.SEED_ADMIN_PASSWORD = 'pilot admin passphrase 2026';
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });
  afterAll(() => ctx.app.close());

  it('refuses to run without --confirm=<the database name>', () => {
    let output = '';
    try {
      execFileSync('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'prisma/reset.ts', '--confirm=iu_hr_dev'], {
        cwd: join(__dirname, '..'),
        env: { ...process.env },
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      output = String((err as { stderr?: string }).stderr ?? '');
    }
    expect(output).toMatch(/permanently deletes ALL data in database "iu_hr_test"/);
  });

  it('empties everything (ledger and audit trail included), deletes uploads, and seeds the baseline', async () => {
    // Some real activity first: XP (ledger rows), Kudos, audit entries, an uploaded file.
    const adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
    const team = await createDepartment(ctx.prisma, 'Old Test Dept');
    await ctx.http().post(`/users/${team.employee.id}/award-xp`).set(bearer(adminToken)).send({ amount: 40, reason: 'x' }).expect(201);
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(join(uploadDir, 'leftover.pdf'), 'test');
    expect(await ctx.prisma.xpTransaction.count()).toBeGreaterThan(0);
    expect(await ctx.prisma.auditLog.count()).toBeGreaterThan(0);

    const summary = await resetToBaseline(ctx.prisma as unknown as PrismaClient, uploadDir);

    expect(summary).toMatchObject({ database: 'iu_hr_test', admin: 'pilot.admin@test.iu.edu.sa', badges: 14, skills: 12 });
    expect(summary.uploadsDeleted).toBeGreaterThanOrEqual(1);
    expect(readdirSync(uploadDir)).toEqual([]);
    for (const count of [
      ctx.prisma.department.count(),
      ctx.prisma.xpTransaction.count(),
      ctx.prisma.auditLog.count(),
      ctx.prisma.activityLog.count(),
      ctx.prisma.notification.count(),
      ctx.prisma.refreshToken.count(),
    ]) {
      expect(await count).toBe(0);
    }
    const users = await ctx.prisma.user.findMany();
    expect(users.map((u) => [u.email, u.role, u.totalXp])).toEqual([['pilot.admin@test.iu.edu.sa', 'admin', 0]]);

    // The fresh system works: the admin signs in and the ledger verifies.
    const res = await ctx.http().post('/auth/login').send({ email: 'pilot.admin@test.iu.edu.sa', password: 'pilot admin passphrase 2026' }).expect(200);
    const verify = await ctx.http().get('/ledger/verify').set(bearer(res.body.accessToken)).expect(200);
    expect(verify.body).toMatchObject({ ok: true, checkedRows: 0 });
  });
});
