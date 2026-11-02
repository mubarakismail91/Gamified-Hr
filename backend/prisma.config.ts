import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved the CLI's connection config out of schema.prisma and into
 * this file — used by `prisma migrate`/`prisma studio`/`prisma db seed`.
 * The running app's PrismaClient gets its own connection via a driver
 * adapter instead (see src/prisma/prisma.service.ts); this file is CLI-only.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node -r tsconfig-paths/register prisma/seed.ts',
  },
});
