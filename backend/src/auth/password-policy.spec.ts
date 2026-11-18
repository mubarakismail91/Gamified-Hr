import { BadRequestException } from '@nestjs/common';
import { assertPasswordAllowed } from './password-policy';

const ctx = { email: 'sara.alqahtani@iu.edu.sa', sameAsCurrent: false };

describe('password policy', () => {
  it('accepts a long passphrase', () => {
    expect(() => assertPasswordAllowed('green dates at sunset 77', ctx)).not.toThrow();
  });

  it.each([
    ['too short', 'Short1!', /at least 12/],
    ['containing the email name', 'sara.alqahtani2026!', /email name/],
    ['a common word with digits', 'Password123456', /common word/],
    ['one repeated character', 'aaaaaaaaaaaaaa', /repeated character/],
  ])('rejects a password %s', (_label, pw, message) => {
    expect(() => assertPasswordAllowed(pw, ctx)).toThrow(message);
  });

  it('rejects reusing the current password', () => {
    expect(() => assertPasswordAllowed('green dates at sunset 77', { ...ctx, sameAsCurrent: true })).toThrow(BadRequestException);
  });
});
