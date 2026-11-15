import { getResearchKey, researchCode } from './research-code';

const KEY = 'k'.repeat(32);

describe('research code (pseudonym)', () => {
  it('looks like User_ + 12 upper-case hex characters', () => {
    expect(researchCode(KEY, 'user-1')).toMatch(/^User_[0-9A-F]{12}$/);
  });

  it('is stable for the same person and key', () => {
    expect(researchCode(KEY, 'user-1')).toBe(researchCode(KEY, 'user-1'));
  });

  it('differs between people', () => {
    expect(researchCode(KEY, 'user-1')).not.toBe(researchCode(KEY, 'user-2'));
  });

  it('changes completely with a different key, so it cannot be recomputed without the key', () => {
    expect(researchCode(KEY, 'user-1')).not.toBe(researchCode('x'.repeat(32), 'user-1'));
  });

  it('contains nothing of the user id', () => {
    expect(researchCode(KEY, 'cmabc123xyz')).not.toContain('ABC123');
  });
});

describe('getResearchKey', () => {
  const config = (value?: string) => ({ get: () => value });

  it('is null when RESEARCH_KEY is missing or too short to be a real secret', () => {
    expect(getResearchKey(config(undefined))).toBeNull();
    expect(getResearchKey(config('replace-me'))).toBeNull();
  });

  it('returns a key of 32+ characters', () => {
    expect(getResearchKey(config(KEY))).toBe(KEY);
  });
});
