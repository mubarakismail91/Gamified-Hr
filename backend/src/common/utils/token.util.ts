import { randomBytes, createHmac } from 'crypto';

/** The raw secret that goes in the httpOnly cookie — never stored anywhere as-is. */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Refresh tokens are opaque random strings, not JWTs — the DB row (looked up
 * by this hash) is the actual source of truth for validity/revocation, so a
 * second signature scheme would be redundant. `secret` (JWT_REFRESH_SECRET)
 * is used as an HMAC pepper: even if the `RefreshToken` table leaks, an
 * attacker without the server's secret can't compute a matching hash for a
 * guessed token.
 */
export function hashToken(raw: string, secret: string): string {
  return createHmac('sha256', secret).update(raw).digest('hex');
}
