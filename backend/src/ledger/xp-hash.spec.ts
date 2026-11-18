import { GENESIS_HASH, hashOf, type HashFields } from './xp-hash';

const row: HashFields = {
  prevHash: GENESIS_HASH,
  userId: 'u1',
  seq: 1,
  amount: 50,
  balanceAfter: 50,
  source: 'quest_approved',
  refType: 'QuestAssignment',
  refId: 'a1',
  idempotencyKey: 'quest:a1',
  actorId: 'm1',
  createdAt: new Date('2026-11-15T09:00:00.123Z'),
};

describe('ledger row hash', () => {
  it('is a 64-character SHA-256 hex digest and deterministic', () => {
    expect(hashOf(row)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOf(row)).toBe(hashOf({ ...row }));
  });

  it.each(Object.keys(row) as (keyof HashFields)[])('changes when %s changes', (field) => {
    const changed = { ...row } as Record<string, unknown>;
    const v = row[field];
    changed[field] = v instanceof Date ? new Date(v.getTime() + 1) : typeof v === 'number' ? v + 1 : `${v ?? ''}x`;
    expect(hashOf(changed as unknown as HashFields)).not.toBe(hashOf(row));
  });

  it('treats a missing reference as empty text', () => {
    expect(hashOf({ ...row, refType: null, refId: null, actorId: null })).toBe(hashOf({ ...row, refType: '', refId: '', actorId: '' } as unknown as HashFields));
  });
});
