import { execSync } from 'child_process';
import { join } from 'path';
import { Client } from 'pg';
import { testDatabaseUrl } from './test-db';

/** Runs once before all API tests: creates the test database if needed and applies every migration. */
export default async function globalSetup(): Promise<void> {
  const url = testDatabaseUrl();
  const dbName = new URL(url).pathname.slice(1);

  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
