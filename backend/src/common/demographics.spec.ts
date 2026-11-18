import { toResponseTag } from './demographics';

describe('toResponseTag (group tag copied onto an anonymous survey response)', () => {
  it('keeps a real group', () => {
    expect(toResponseTag('gen_x')).toBe('gen_x');
    expect(toResponseTag('academic')).toBe('academic');
  });

  it('stores "prefer not to say" and "not recorded" the same way (null)', () => {
    expect(toResponseTag('undisclosed')).toBeNull();
    expect(toResponseTag(null)).toBeNull();
  });
});
