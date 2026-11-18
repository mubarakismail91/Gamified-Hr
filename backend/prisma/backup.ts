import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { runScript } from './prisma-client';

/** pg_dump must be at least as new as the server; Postgres.app's bundled one is tried if PATH's is older. */
const CANDIDATES = [
  process.env.PG_DUMP_PATH,
  '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump',
  '/opt/homebrew/bin/pg_dump',
  'pg_dump',
].filter((p): p is string => !!p);

function majorOf(binary: string): number | null {
  try {
    const out = execFileSync(binary, ['--version'], { encoding: 'utf8' });
    return Number(/(\d+)\.\d+/.exec(out)?.[1] ?? NaN) || null;
  } catch {
    return null;
  }
}

// `npm run db:backup` -> backend/backups/<database>-<timestamp>.dump (git-ignored).
// Restore with:  pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>
runScript(async (prisma) => {
  const [{ db, version }] = await prisma.$queryRaw<{ db: string; version: number }[]>`
    SELECT current_database() AS db, current_setting('server_version_num')::int / 10000 AS version`;
  const pgDump = CANDIDATES.find((c) => (c.includes('/') ? existsSync(c) : true) && (majorOf(c) ?? 0) >= version);
  if (!pgDump) throw new Error(`No pg_dump ${version}+ found. Install one or set PG_DUMP_PATH.`);

  const dir = resolve(__dirname, '..', 'backups');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${db}-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
  // Custom format: compressed, and pg_restore can restore all of it or single tables.
  execFileSync(pgDump, ['--format=custom', '--no-owner', `--file=${file}`, process.env.DATABASE_URL as string], { stdio: 'inherit' });
  console.log(`Backed up "${db}" to ${file} (${Math.round(statSync(file).size / 1024)} KB) using ${pgDump}.`);
});
