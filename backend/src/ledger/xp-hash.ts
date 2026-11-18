import { createHash } from 'crypto';

/** prevHash of a person's first ledger row. */
export const GENESIS_HASH = '0'.repeat(64);

export interface HashFields {
  prevHash: string;
  userId: string;
  seq: number;
  amount: number;
  balanceAfter: number;
  source: string;
  refType: string | null;
  refId: string | null;
  idempotencyKey: string;
  actorId: string | null;
  createdAt: Date;
}

/**
 * SHA-256 of a ledger row's fields plus the previous row's hash. Must stay byte-for-byte identical
 * to the SQL function xp_hash() in the xp_ledger migration (used for the backfill).
 */
export function hashOf(f: HashFields): string {
  const canonical = [
    f.prevHash,
    f.userId,
    f.seq,
    f.amount,
    f.balanceAfter,
    f.source,
    f.refType ?? '',
    f.refId ?? '',
    f.idempotencyKey,
    f.actorId ?? '',
    f.createdAt.toISOString(),
  ].join('|');
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
