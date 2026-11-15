import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate limiting. Normally counted per client IP. For the login route the key is IP + email,
 * so guessing one person's password is limited without locking out everyone behind the same
 * campus network address (NAT).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const r = req as unknown as Request;
    const ip = r.ip ?? 'unknown';
    if (r.path === '/auth/login') {
      const email = typeof r.body?.email === 'string' ? r.body.email.trim().toLowerCase() : '';
      return `login:${ip}:${email}`;
    }
    return ip;
  }
}

/** Limits are read on every request, so they can be tuned with environment variables (and tests can change them). */
export const generalLimit = () => Number(process.env.RATE_LIMIT_PER_MINUTE ?? 300);
export const loginLimit = () => Number(process.env.LOGIN_ATTEMPTS_PER_15_MIN ?? 5);
export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
