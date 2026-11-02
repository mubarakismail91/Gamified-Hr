import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { initialsFrom, pickAvatarTone, generateStaffId } from '../src/common/utils/identity.util';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Bootstraps the very first Admin account — there is no signup page, so this
 * is the only way an Admin identity ever comes into existence. Safe to
 * re-run: it's a no-op if that email is already taken.
 *
 * Usage: npm run seed:admin   (reads SEED_ADMIN_* from backend/.env)
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const nameEn = process.env.SEED_ADMIN_NAME_EN ?? 'System Administrator';
  const nameAr = process.env.SEED_ADMIN_NAME_AR ?? 'مدير النظام';

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in backend/.env before seeding.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists for ${email} — nothing to do.`);
    return;
  }

  const userCount = await prisma.user.count();
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      staffId: generateStaffId(),
      nameEn,
      nameAr,
      initials: initialsFrom(nameEn),
      titleEn: 'System Administrator',
      titleAr: 'مدير النظام',
      email,
      passwordHash,
      role: 'admin',
      gender: 'male',
      departmentId: null, // Admin is university-wide — see the "Admin has no department" decision
      avatarTone: pickAvatarTone(userCount),
      // Force a password change on first login since this one came from a
      // plaintext .env value, not something only the Admin ever knew.
      mustChangePassword: true,
    },
  });

  console.log('Seeded first Admin account:');
  console.log(`  email:    ${admin.email}`);
  console.log(`  password: ${password}  (from .env — change it after first login)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
