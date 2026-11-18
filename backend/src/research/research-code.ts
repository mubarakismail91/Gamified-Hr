import { createHmac } from 'crypto';
import type { ConfigService } from '@nestjs/config';

/** Version of the consent text an employee agrees to. Bump it when the text changes. */
export const CONSENT_VERSION = '2026-11-v1';

/** Keys shorter than this are treated as "not configured", so a placeholder can't be used by accident. */
const MIN_KEY_LENGTH = 32;

/**
 * The research key lives only in the environment (RESEARCH_KEY), never in the database.
 * Returns null when it isn't configured, which switches the research track off.
 */
export function getResearchKey(config: Pick<ConfigService, 'get'>): string | null {
  const key = config.get<string>('RESEARCH_KEY');
  return key && key.length >= MIN_KEY_LENGTH ? key : null;
}

/**
 * The pseudonym for one participant: "User_" + the first 12 hex characters (48 bits) of
 * HMAC-SHA256(key, userId). The same user always gets the same code under the same key.
 * Without the key, a code can't be turned back into a person (or recomputed from a user id).
 * Changing the key changes every code, so it must stay the same for the whole study.
 */
export function researchCode(key: string, userId: string): string {
  return `User_${createHmac('sha256', key).update(userId).digest('hex').slice(0, 12).toUpperCase()}`;
}
