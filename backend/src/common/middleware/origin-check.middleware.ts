import type { NextFunction, Request, Response } from 'express';
import { allowedOrigins } from '../../config/env.validation';

/**
 * CSRF protection for the cookie-based routes. /auth/refresh and /auth/logout are authenticated by
 * the httpOnly refresh cookie, which in production is SameSite=None (frontend and API are on
 * different sites), so a browser would attach it to a request forged by another website. Browsers
 * always send an Origin header on cross-site POSTs, so any POST to /auth/* whose Origin isn't the
 * real frontend is refused. Requests without an Origin (curl, server-to-server) carry no cookie of
 * a victim's browser and are allowed. Every other route uses the Authorization header, which
 * another site can't set, so CSRF doesn't apply to them.
 */
export function authOriginCheck(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (req.method === 'POST' && req.path.startsWith('/auth/') && origin && !allowedOrigins().includes(origin)) {
    res.status(403).json({ statusCode: 403, message: 'Request origin not allowed.' });
    return;
  }
  next();
}
