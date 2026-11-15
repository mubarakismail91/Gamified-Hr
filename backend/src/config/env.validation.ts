/**
 * Checked once at startup (ConfigModule `validate`). In production the API refuses to start with
 * missing, short or placeholder secrets, so a deployment can't accidentally run with the values
 * from .env.example. In development and tests only the essentials are required.
 */
const PLACEHOLDER = /replace|changeme|change-me|example|secret123|password/i;
const MIN_SECRET_LENGTH = 32;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const str = (key: string) => (typeof config[key] === 'string' ? (config[key] as string) : '');

  for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!str(key)) errors.push(`${key} is required.`);
  }

  if (str('NODE_ENV') === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      const value = str(key);
      if (value.length < MIN_SECRET_LENGTH) errors.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters in production.`);
      if (PLACEHOLDER.test(value)) errors.push(`${key} looks like a placeholder; generate a random value (openssl rand -hex 32).`);
    }
    if (str('JWT_ACCESS_SECRET') && str('JWT_ACCESS_SECRET') === str('JWT_REFRESH_SECRET')) {
      errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
    }
    const research = str('RESEARCH_KEY');
    if (research && (research.length < MIN_SECRET_LENGTH || PLACEHOLDER.test(research))) {
      errors.push(`RESEARCH_KEY must be a random value of at least ${MIN_SECRET_LENGTH} characters (or unset).`);
    }
    if (!str('CORS_ORIGIN')) errors.push('CORS_ORIGIN must be set in production (the frontend URL).');
  }

  if (errors.length) throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  return config;
}

/** The frontend origins allowed to call the API with credentials (comma-separated CORS_ORIGIN). */
export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
