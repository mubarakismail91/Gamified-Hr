import * as bcrypt from 'bcrypt';

/**
 * bcrypt work factor for NEW password hashes. 10 is OWASP's recommended minimum; each +1 doubles
 * the CPU time per sign-in. The load test (item 8) showed cost 12 limits a 2,850-person sign-in
 * rush to ~16 sign-ins/s on one server; 10 is ~4x cheaper. Existing hashes keep the cost they were
 * made with (bcrypt stores it in the hash). Set BCRYPT_ROUNDS to change it (10–14).
 */
export function bcryptRounds(): number {
  const n = Number(process.env.BCRYPT_ROUNDS ?? 10);
  return Number.isInteger(n) && n >= 10 && n <= 14 ? n : 10;
}

export const hashPassword = (password: string) => bcrypt.hash(password, bcryptRounds());
