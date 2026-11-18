import { allowedOrigins, validateEnv } from './env.validation';

const strong = (c: string) => c.repeat(40);
const base = { DATABASE_URL: 'postgresql://x', JWT_ACCESS_SECRET: strong('a'), JWT_REFRESH_SECRET: strong('b') };

describe('validateEnv', () => {
  it('requires the essentials in every environment', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).toThrow(/DATABASE_URL is required/);
  });

  it('is relaxed in development (short secrets allowed)', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'dev', JWT_REFRESH_SECRET: 'dev2' })).not.toThrow();
  });

  it('accepts strong, distinct secrets in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', CORS_ORIGIN: 'https://app.example.org' })).not.toThrow();
  });

  it.each([
    ['a short secret', { JWT_ACCESS_SECRET: 'short' }, /at least 32/],
    ['the .env.example placeholder', { JWT_ACCESS_SECRET: 'replace-with-a-long-random-string-0000000' }, /placeholder/],
    ['the same secret twice', { JWT_REFRESH_SECRET: strong('a') }, /must be different/],
    ['a weak research key', { RESEARCH_KEY: 'too-short' }, /RESEARCH_KEY/],
    ['no CORS origin', { CORS_ORIGIN: '' }, /CORS_ORIGIN/],
  ])('refuses to start in production with %s', (_label, override, message) => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', CORS_ORIGIN: 'https://app.example.org', ...override })).toThrow(message);
  });
});

describe('allowedOrigins', () => {
  it('splits a comma-separated CORS_ORIGIN', () => {
    process.env.CORS_ORIGIN = 'https://a.example, https://b.example';
    expect(allowedOrigins()).toEqual(['https://a.example', 'https://b.example']);
    delete process.env.CORS_ORIGIN;
  });
});
