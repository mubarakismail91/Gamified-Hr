import { BadRequestException } from '@nestjs/common';
import { assertNotExpired, isExpired } from './quest-expiry.util';

describe('quest expiry', () => {
  const now = new Date('2026-11-15T12:00:00Z');

  it('a quest without a deadline never expires', () => {
    expect(isExpired({ dueAt: null }, now)).toBe(false);
  });

  it('expires the moment its deadline passes', () => {
    expect(isExpired({ dueAt: new Date('2026-11-15T11:59:59Z') }, now)).toBe(true);
    expect(isExpired({ dueAt: now }, now)).toBe(true);
    expect(isExpired({ dueAt: new Date('2026-11-15T12:00:01Z') }, now)).toBe(false);
  });

  it('assertNotExpired throws a 400 for an expired quest', () => {
    expect(() => assertNotExpired({ dueAt: new Date(Date.now() - 1000) })).toThrow(BadRequestException);
    expect(() => assertNotExpired({ dueAt: null })).not.toThrow();
  });
});
