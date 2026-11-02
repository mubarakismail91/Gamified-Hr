/**
 * Parses the small set of duration strings we use in .env (e.g. "15m", "7d")
 * into milliseconds. Deliberately not a general-purpose library — just enough
 * to turn JWT_REFRESH_EXPIRES_IN into a concrete `expiresAt` Date for the
 * RefreshToken row.
 */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration "${input}" — expected a number followed by s, m, h, or d (e.g. "15m", "7d").`);
  }
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return value * unitMs;
}
