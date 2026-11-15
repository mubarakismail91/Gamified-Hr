import type { PrismaClient } from '@prisma/client';
import { initialsFrom, pickAvatarTone, generateStaffId } from '../src/common/utils/identity.util';
import { runScript } from './prisma-client';
import { hashPassword } from '../src/common/utils/password-hash';

/**
 * Bootstraps the very first Admin account — there is no signup page, so this
 * is the only way an Admin identity ever comes into existence. Safe to
 * re-run: it's a no-op if that email is already taken.
 *
 * Usage: npm run seed:admin   (reads SEED_ADMIN_* from backend/.env)
 */
/** Creates the first Admin from SEED_ADMIN_* (no-op if that email exists). Returns the email, or null if it existed. */
export async function seedAdmin(prisma: PrismaClient): Promise<string | null> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const nameEn = process.env.SEED_ADMIN_NAME_EN ?? 'System Administrator';
  const nameAr = process.env.SEED_ADMIN_NAME_AR ?? 'مدير النظام';

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in backend/.env before seeding.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return null;
  }

  const userCount = await prisma.user.count();
  const passwordHash = await hashPassword(password);

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

  return admin.email;
}

// `npm run seed:admin`
if (require.main === module) {
  runScript(async (prisma) => {
    const email = await seedAdmin(prisma);
    console.log(email ? `Seeded first Admin account: ${email} (password from SEED_ADMIN_PASSWORD in .env)` : 'Admin account already exists — nothing to do.');
  });
}
