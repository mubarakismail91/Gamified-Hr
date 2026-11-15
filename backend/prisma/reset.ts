import { readdir, rm } from 'fs/promises';
import { join, resolve } from 'path';
import type { PrismaClient } from '@prisma/client';
import { runScript } from './prisma-client';
import { seedAdmin } from './seed';
import { seedBadges } from './seed-badges';
import { seedSkills } from './seed-skills';

export interface ResetSummary {
  database: string;
  tablesEmptied: number;
  uploadsDeleted: number;
  admin: string | null;
  badges: number;
  skills: number;
}

/**
 * Empties EVERY table (keeping the migration history), deletes uploaded files, and seeds the
 * pilot baseline: the first Admin (SEED_ADMIN_* from .env), the badge catalog and the skill
 * catalog. TRUNCATE is used because the XP ledger and audit trail refuse row-by-row deletes by
 * design; only a deliberate whole-table reset like this one can clear them.
 */
export async function resetToBaseline(prisma: PrismaClient, uploadDir: string): Promise<ResetSummary> {
  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  }

  let uploadsDeleted = 0;
  const files = await readdir(uploadDir).catch(() => [] as string[]);
  for (const f of files) {
    await rm(join(uploadDir, f), { recursive: true, force: true });
    uploadsDeleted += 1;
  }

  const admin = await seedAdmin(prisma);
  const badges = await seedBadges(prisma);
  const skills = await seedSkills(prisma);
  return { database: db, tablesEmptied: tables.length, uploadsDeleted, admin, badges, skills };
}

// `npm run db:reset -- --confirm=<database name>`
if (require.main === module) {
  runScript(async (prisma) => {
    const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    const confirm = process.argv.find((a) => a.startsWith('--confirm='))?.slice('--confirm='.length);
    if (confirm !== db) {
      throw new Error(
        `This permanently deletes ALL data in database "${db}" (users, quests, XP, surveys, audit trail, uploads).\n` +
          `Take a backup first (npm run db:backup), then re-run with:  npm run db:reset -- --confirm=${db}`,
      );
    }
    const summary = await resetToBaseline(prisma, resolve(process.env.UPLOAD_DIR ?? './uploads'));
    console.log(`Reset "${summary.database}": emptied ${summary.tablesEmptied} tables, deleted ${summary.uploadsDeleted} uploaded files.`);
    console.log(`Baseline: admin ${summary.admin ?? '(not created)'}, ${summary.badges} badges, ${summary.skills} skills.`);
    console.log('Sign in with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from backend/.env.');
  });
}
