/**
 * Load-test setup (item 8). Creates a SEPARATE database (iu_hr_load), applies every migration, writes
 * loadtest/load.env (git-ignored: fresh random secrets, production mode, rate limits lifted because
 * every simulated user comes from 127.0.0.1), and seeds a realistic university:
 *   STAFF employees in 30 departments (+30 managers, 1 admin), quests, quest history, XP (activity
 *   feed + hash-chained ledger), Kudos, notifications, badges and squads.
 * Your dev database is never touched.
 *
 *   npm run load:setup            (STAFF=3000 by default)
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import { randomBytes, randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Client } from 'pg';
import { Prisma } from '@prisma/client';
import { scriptClient } from '../prisma/prisma-client';
import { seedBadges } from '../prisma/seed-badges';
import { seedSkills } from '../prisma/seed-skills';
import { GENESIS_HASH, hashOf } from '../src/ledger/xp-hash';
import { hashPassword } from '../src/common/utils/password-hash';

export const LOAD_DB = 'iu_hr_load';
export const LOAD_PASSWORD = 'load-test passphrase 2026';
export const LOAD_PORT = 4100;
const STAFF = Number(process.env.STAFF ?? 3000);
const DEPARTMENTS = 30;
const DAY = 86_400_000;

const FIRST = ['Abdullah', 'Mohammed', 'Ahmed', 'Omar', 'Khalid', 'Yusuf', 'Ibrahim', 'Saad', 'Faisal', 'Hamza', 'Aisha', 'Fatimah', 'Maryam', 'Noura', 'Huda', 'Reem', 'Sara', 'Layla', 'Asma', 'Hind'];
const LAST = ['Al-Harbi', 'Al-Qahtani', 'Al-Ghamdi', 'Al-Zahrani', 'Al-Otaibi', 'Al-Shehri', 'Al-Dosari', 'Al-Juhani', 'Al-Mutairi', 'Al-Subaie'];
const pick = <T>(xs: T[], i: number) => xs[i % xs.length];
const rnd = (n: number) => Math.floor(Math.random() * n);

async function createDatabase(url: string) {
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const c = new Client({ connectionString: admin.toString() });
  await c.connect();
  try {
    await c.query(`DROP DATABASE IF EXISTS "${LOAD_DB}" WITH (FORCE)`);
    await c.query(`CREATE DATABASE "${LOAD_DB}"`);
  } finally {
    await c.end();
  }
}

async function main() {
  const base = new URL(process.env.DATABASE_URL as string);
  base.pathname = `/${LOAD_DB}`;
  const url = base.toString();

  console.log(`Creating ${LOAD_DB} and applying migrations...`);
  await createDatabase(url);
  execSync('npx prisma migrate deploy', { cwd: join(__dirname, '..'), env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });

  const secret = () => randomBytes(32).toString('hex');
  writeFileSync(
    join(__dirname, 'load.env'),
    [
      `DATABASE_URL="${url}"`,
      'NODE_ENV=production',
      `PORT=${LOAD_PORT}`,
      'CORS_ORIGIN=http://localhost:5173',
      `JWT_ACCESS_SECRET=${secret()}`,
      `JWT_REFRESH_SECRET=${secret()}`,
      'JWT_ACCESS_EXPIRES_IN=60m',
      `RESEARCH_KEY=${secret()}`,
      'RATE_LIMIT_PER_MINUTE=100000000',
      'LOGIN_ATTEMPTS_PER_15_MIN=100000000',
      'RETENTION_JOB_ENABLED=false',
      `UPLOAD_DIR=${join(tmpdir(), 'iu-hr-load-uploads')}`,
      '',
    ].join('\n'),
  );

  const prisma = scriptClient(url);
  try {
    await seedBadges(prisma);
    await seedSkills(prisma);
    // Hashed exactly like real accounts (same bcrypt cost), so sign-in costs are realistic. One hash, shared password.
    const passwordHash = await hashPassword(LOAD_PASSWORD);
    const now = Date.now();

    const user = (i: number, role: 'employee' | 'manager' | 'admin', departmentId: string | null, email: string) => {
      const name = `${pick(FIRST, i)} ${pick(LAST, Math.floor(i / FIRST.length))}`;
      return {
        id: `lu_${role}_${i}`,
        staffId: `IU-L${String(i).padStart(5, '0')}${role[0]}`,
        nameEn: name,
        nameAr: name,
        initials: name.split(' ').map((p) => p[0]).join('').slice(0, 2),
        titleEn: role === 'employee' ? 'Staff member' : role === 'manager' ? 'Head of department' : 'Administrator',
        titleAr: role,
        email,
        passwordHash,
        role,
        gender: (i % 2 ? 'male' : 'female') as 'male' | 'female',
        generation: (['gen_z', 'millennial', 'gen_x', 'boomer'] as const)[i % 4],
        staffType: (['academic', 'administrative'] as const)[i % 2],
        avatarTone: 'bg-emerald-100 text-emerald-800',
        departmentId,
      };
    };

    console.log(`Seeding ${STAFF} employees in ${DEPARTMENTS} departments...`);
    const depts = Array.from({ length: DEPARTMENTS }, (_, d) => ({ id: `ld_${d}`, nameEn: `Department ${d + 1}`, nameAr: `القسم ${d + 1}` }));
    await prisma.department.createMany({ data: depts });
    await prisma.user.createMany({ data: [user(0, 'admin', null, 'admin@load.test')] });
    await prisma.user.createMany({ data: depts.map((d, i) => user(i, 'manager', d.id, `manager${i}@load.test`)) });
    for (const d of depts) await prisma.department.update({ where: { id: d.id }, data: { managerId: `lu_manager_${d.id.slice(3)}` } });
    const employees = Array.from({ length: STAFF }, (_, i) => user(i, 'employee', depts[i % DEPARTMENTS].id, `employee${i}@load.test`));
    for (let i = 0; i < employees.length; i += 1000) await prisma.user.createMany({ data: employees.slice(i, i + 1000) });

    // Quests: 10 per department + 20 university-wide.
    const quests = [
      ...depts.flatMap((d, di) =>
        Array.from({ length: 10 }, (_, q) => ({ id: `lq_${di}_${q}`, departmentId: d.id as string | null, createdById: `lu_manager_${di}` })),
      ),
      ...Array.from({ length: 20 }, (_, q) => ({ id: `lq_u_${q}`, departmentId: null as string | null, createdById: 'lu_admin_0' })),
    ].map((q, i) => ({
      ...q,
      titleEn: `Quest ${i + 1}`,
      titleAr: `مهمة ${i + 1}`,
      categoryEn: 'Professional development',
      categoryAr: 'التطوير المهني',
      cadence: (i % 3 ? 'daily' : 'epic') as 'daily' | 'epic',
      xp: 20 + (i % 5) * 20,
      status: 'published' as const,
      skillBranch: (['teaching', 'research', 'leadership', 'digital'] as const)[i % 4],
    }));
    await prisma.quest.createMany({ data: quests });

    // History per employee: 6 accepted quests (4 approved in the last 60 days), 2 Kudos received,
    // 20 notifications, a few badges. XP goes into both the activity feed and the ledger.
    const assignments: Prisma.QuestAssignmentCreateManyInput[] = [];
    const activity: Prisma.ActivityLogCreateManyInput[] = [];
    const ledger: Prisma.XpTransactionCreateManyInput[] = [];
    const kudos: Prisma.KudoCreateManyInput[] = [];
    const notifications: Prisma.NotificationCreateManyInput[] = [];
    const userBadges: Prisma.UserBadgeCreateManyInput[] = [];
    const totals = new Map<string, number>();
    const badgeIds = (await prisma.badge.findMany({ select: { id: true } })).map((b) => b.id);

    employees.forEach((e, i) => {
      const di = i % DEPARTMENTS;
      const events: { at: Date; amount: number; source: 'quest_approved' | 'kudos_received'; ref: string; refType: string; text: string; kind: 'quest' | 'kudo' }[] = [];
      for (let k = 0; k < 6; k++) {
        const q = k < 5 ? quests[di * 10 + ((i + k) % 10)] : quests[300 + (i % 20)];
        const done = k < 4;
        const at = new Date(now - (1 + rnd(60)) * DAY - rnd(DAY));
        const id = `la_${i}_${k}`;
        assignments.push({ id, questId: q.id, employeeId: e.id, status: done ? 'completed' : 'accepted', stepsDone: done ? 1 : 0, acceptedAt: new Date(at.getTime() - DAY), approvedAt: done ? at : null });
        if (done) events.push({ at, amount: q.xp, source: 'quest_approved', ref: id, refType: 'QuestAssignment', text: `Completed quest: ${q.titleEn}`, kind: 'quest' });
      }
      for (let k = 0; k < 2; k++) {
        const from = employees[(i + 1 + k * 7) % STAFF];
        const id = `lk_${i}_${k}`;
        const at = new Date(now - rnd(30) * DAY - rnd(DAY));
        kudos.push({ id, fromUserId: from.id, toUserId: e.id, value: 'collaboration', messageEn: 'Thank you for your help this week.', messageAr: 'شكرًا لمساعدتك هذا الأسبوع.', createdAt: at });
        events.push({ at, amount: 15, source: 'kudos_received', ref: id, refType: 'Kudo', text: `Received Kudos from ${from.nameEn}`, kind: 'kudo' });
      }
      events.sort((a, b) => a.at.getTime() - b.at.getTime());
      let prev = GENESIS_HASH;
      let balance = 0;
      events.forEach((ev, s) => {
        balance += ev.amount;
        const row = { userId: e.id, seq: s + 1, amount: ev.amount, balanceAfter: balance, source: ev.source, refType: ev.refType, refId: ev.ref, idempotencyKey: `${ev.source}:${ev.ref}`, actorId: null, prevHash: prev, createdAt: ev.at };
        const hash = hashOf(row);
        ledger.push({ ...row, hash });
        prev = hash;
        activity.push({ userId: e.id, kind: ev.kind, textEn: ev.text, textAr: ev.text, xpDelta: ev.amount, refType: ev.refType, refId: ev.ref, createdAt: ev.at });
      });
      totals.set(e.id, balance);
      for (let n = 0; n < 20; n++) {
        notifications.push({ userId: e.id, kind: 'quest', titleEn: 'Quest update', titleAr: 'تحديث مهمة', bodyEn: 'A quest you follow was updated.', bodyAr: 'تم تحديث مهمة تتابعها.', isRead: n > 2, createdAt: new Date(now - n * DAY) });
      }
      for (let b = 0; b < 1 + (i % 3); b++) userBadges.push({ userId: e.id, badgeId: badgeIds[(i + b) % badgeIds.length] });
    });

    const insert = async <T>(label: string, rows: T[], fn: (batch: T[]) => Promise<unknown>) => {
      for (let i = 0; i < rows.length; i += 2000) await fn(rows.slice(i, i + 2000));
      console.log(`  ${label}: ${rows.length}`);
    };
    await insert('quest assignments', assignments, (b) => prisma.questAssignment.createMany({ data: b }));
    await insert('kudos', kudos, (b) => prisma.kudo.createMany({ data: b }));
    await insert('activity rows', activity, (b) => prisma.activityLog.createMany({ data: b }));
    await insert('ledger rows', ledger, (b) => prisma.xpTransaction.createMany({ data: b }));
    await insert('notifications', notifications, (b) => prisma.notification.createMany({ data: b }));
    await insert('badges earned', userBadges, (b) => prisma.userBadge.createMany({ data: b, skipDuplicates: true }));
    await prisma.$executeRaw`UPDATE "User" u SET "totalXp" = l."balanceAfter" FROM (SELECT DISTINCT ON ("userId") "userId", "balanceAfter" FROM "XpTransaction" ORDER BY "userId", seq DESC) l WHERE l."userId" = u.id`;

    // 300 squads of 5 (half the staff), mixing departments.
    const squads = Array.from({ length: Math.floor(STAFF / 10) }, (_, s) => ({ id: `ls_${s}`, name: `Squad ${s + 1}`, createdById: employees[s * 5].id }));
    await prisma.squad.createMany({ data: squads });
    await insert('squad members', squads.flatMap((sq, s) => Array.from({ length: 5 }, (_, m) => ({ id: randomUUID(), squadId: sq.id, userId: employees[s * 5 + m].id, status: 'active' as const, joinedAt: new Date() }))), (b) => prisma.squadMember.createMany({ data: b }));
    await prisma.$executeRawUnsafe('ANALYZE');
    console.log(`Done. Start the target with: npm run build && npm run load:server   (port ${LOAD_PORT})`);
  } finally {
    await prisma.$disconnect();
  }
}

// Only when run directly (`npm run load:setup`); run.ts imports the constants above without re-seeding.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
