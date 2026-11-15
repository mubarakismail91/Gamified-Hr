import { BadRequestException } from '@nestjs/common';

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128; // bcrypt only uses the first 72 bytes; this just stops absurd inputs

/** A short list of the most common choices; length does most of the work (NIST SP 800-63B style). */
const COMMON = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'iloveyou', 'admin', 'madinah', 'islamic', 'university'];

/**
 * Rules for a NEW password: long enough, not the email name, not a common word with numbers
 * around it, and not the same as before. No forced symbol/upper-case rules — long passphrases
 * are both stronger and easier to remember.
 */
export function assertPasswordAllowed(password: string, ctx: { email: string; sameAsCurrent: boolean }): void {
  const lower = password.toLowerCase();
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) problems.push(`at least ${MIN_PASSWORD_LENGTH} characters`);
  if (password.length > MAX_PASSWORD_LENGTH) problems.push(`at most ${MAX_PASSWORD_LENGTH} characters`);
  const local = ctx.email.split('@')[0]?.toLowerCase() ?? '';
  if (local.length >= 4 && lower.includes(local)) problems.push('not containing your email name');
  const stripped = lower.replace(/[^a-z]/g, '');
  if (COMMON.some((w) => stripped === w || stripped === w.repeat(2))) problems.push('not a common word');
  if (/^(.)\1+$/.test(password)) problems.push('not one repeated character');
  if (ctx.sameAsCurrent) problems.push('different from your current password');
  if (problems.length) throw new BadRequestException(`New password must be ${problems.join(', ')}.`);
}
