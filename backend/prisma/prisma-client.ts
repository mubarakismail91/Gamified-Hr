import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/** A PrismaClient for the command-line scripts in this folder (the app uses PrismaService instead). */
export function scriptClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('DATABASE_URL is not set (backend/.env).');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Runs a script's main function with a client, always disconnecting, and sets the exit code on failure. */
export function runScript(main: (prisma: PrismaClient) => Promise<void>): void {
  const prisma = scriptClient();
  main(prisma)
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
