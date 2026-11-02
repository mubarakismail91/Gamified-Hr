/**
 * Ported 1:1 from the frontend demo's `src/store/DemoDataContext.tsx` so a
 * server-created user gets the exact same initials/avatar styling a
 * demo-seeded one used to. Do not change independently of that file.
 */

/** "Dr. Ahmed Al-Mansouri" -> "AA" (strips a leading "Dr." title, takes first 2 words). */
export function initialsFrom(name: string): string {
  const parts = name
    .replace(/^Dr\.\s*/, '')
    .trim()
    .split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U';
}

const AVATAR_TONES = ['bg-primary/10 text-primary', 'bg-accent/15 text-accent-foreground'];

/** Deterministic round robin, same as the demo's `AVATAR_TONES[users.length % AVATAR_TONES.length]`. */
export function pickAvatarTone(existingUserCount: number): string {
  return AVATAR_TONES[existingUserCount % AVATAR_TONES.length];
}

/** e.g. "IU-83920" — matches the demo's `IU-${5-digit random}` format. */
export function generateStaffId(): string {
  return `IU-${Math.floor(10000 + Math.random() * 89999)}`;
}
