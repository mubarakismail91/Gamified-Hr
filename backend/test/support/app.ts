import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';

export const PASSWORD = 'Test-password-1';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
}

/** Boots the real AppModule (all guards, pipes and modules) against the test database. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), http: () => request(app.getHttpServer()) };
}

/** Empties every table (keeps the migration history), so each test file starts from a blank database. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let passwordHash: string | undefined;
let counter = 0;

/** Inserts a user directly (admins normally provision accounts through the UI). */
export async function createUser(
  prisma: PrismaService,
  role: 'employee' | 'manager' | 'admin',
  opts: {
    departmentId?: string | null;
    name?: string;
    totalXp?: number;
    generation?: 'gen_z' | 'millennial' | 'gen_x' | 'boomer' | 'undisclosed' | null;
    staffType?: 'academic' | 'administrative' | 'undisclosed' | null;
  } = {},
) {
  passwordHash ??= await bcrypt.hash(PASSWORD, 4); // low cost: fast tests, same algorithm
  counter += 1;
  const name = opts.name ?? `Test ${role} ${counter}`;
  return prisma.user.create({
    data: {
      staffId: `IU-T${String(counter).padStart(4, '0')}`,
      nameEn: name,
      nameAr: name,
      initials: 'TT',
      titleEn: role,
      titleAr: role,
      email: `${role}${counter}@test.iu.edu.sa`,
      passwordHash,
      role,
      gender: counter % 2 ? 'male' : 'female',
      avatarTone: 'bg-emerald-100 text-emerald-800',
      departmentId: opts.departmentId ?? null,
      totalXp: opts.totalXp ?? 0,
      generation: opts.generation ?? null,
      staffType: opts.staffType ?? null,
    },
  });
}

/**
 * A department with a manager and two employees. Department.managerId is the
 * relation the server uses for "this manager's team".
 */
export async function createDepartment(prisma: PrismaService, name: string) {
  const dept = await prisma.department.create({ data: { nameEn: name, nameAr: name } });
  const manager = await createUser(prisma, 'manager', { departmentId: dept.id, name: `${name} Manager` });
  await prisma.department.update({ where: { id: dept.id }, data: { managerId: manager.id } });
  const employee = await createUser(prisma, 'employee', { departmentId: dept.id, name: `${name} Employee A` });
  const colleague = await createUser(prisma, 'employee', { departmentId: dept.id, name: `${name} Employee B` });
  return { dept, manager, employee, colleague };
}

/** Logs in through the real endpoint and returns the bearer access token. */
export async function login(ctx: TestContext, email: string): Promise<string> {
  const res = await ctx.http().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
  return res.body.accessToken as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Inserts a published quest directly. */
export async function createQuest(
  prisma: PrismaService,
  opts: { createdById: string; departmentId?: string | null; xp?: number; steps?: number; dueAt?: Date | null; title?: string },
) {
  const title = opts.title ?? 'Test quest';
  return prisma.quest.create({
    data: {
      titleEn: title,
      titleAr: title,
      categoryEn: 'General',
      categoryAr: 'عام',
      cadence: 'daily',
      xp: opts.xp ?? 50,
      steps: opts.steps ?? 1,
      dueAt: opts.dueAt ?? null,
      status: 'published',
      departmentId: opts.departmentId ?? null,
      createdById: opts.createdById,
    },
  });
}

/** Puts an employee's quest straight into "waiting for approval" with a pending submission. */
export async function createPendingSubmission(prisma: PrismaService, questId: string, employeeId: string) {
  const assignment = await prisma.questAssignment.create({
    data: { questId, employeeId, status: 'pending_approval', stepsDone: 1, submittedAt: new Date() },
  });
  await prisma.questSubmission.create({ data: { assignmentId: assignment.id, employeeId } });
  return assignment;
}
