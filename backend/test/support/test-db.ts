import { config } from 'dotenv';
import { join } from 'path';

/**
 * The API tests run against their OWN database, never the dev one, because
 * every test file wipes all tables before it starts.
 *
 * Uses TEST_DATABASE_URL when set (CI sets it). Otherwise it takes
 * DATABASE_URL from backend/.env and swaps the database name for
 * `iu_hr_test`, so the same local Postgres user works for both.
 */
export function testDatabaseUrl(): string {
  config({ path: join(__dirname, '..', '..', '.env'), quiet: true });

  let url = process.env.TEST_DATABASE_URL;
  if (!url) {
    const devUrl = process.env.DATABASE_URL;
    if (!devUrl) throw new Error('Set TEST_DATABASE_URL (or DATABASE_URL in backend/.env) to run the API tests.');
    const parsed = new URL(devUrl);
    parsed.pathname = '/iu_hr_test';
    url = parsed.toString();
  }

  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.includes('test')) {
    throw new Error(`Refusing to run API tests against "${dbName}": the test database name must contain "test".`);
  }
  return url;
}
