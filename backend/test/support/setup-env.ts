import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { testDatabaseUrl } from './test-db';

/**
 * Runs in every test worker before any app code is imported. Values already
 * in process.env win over backend/.env (ConfigModule never overrides them),
 * so this points the whole app at the test database.
 */
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
// A fixed research key so research codes are predictable in tests (never use this value for real).
process.env.RESEARCH_KEY = 'test-research-key-0123456789abcdef0123456789';

// Uploaded evidence files go to a throwaway folder, not backend/uploads.
process.env.UPLOAD_DIR = join(tmpdir(), 'iu-hr-test-uploads');
mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
