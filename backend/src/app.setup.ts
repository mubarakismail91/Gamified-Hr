import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { allowedOrigins } from './config/env.validation';
import { authOriginCheck } from './common/middleware/origin-check.middleware';
import { SocketIoAdapter } from './realtime/socket-io.adapter';

/**
 * Middleware and pipes shared by the real server (main.ts) and the API tests,
 * so the tests exercise exactly the same validation and cookie handling.
 */
export function configureApp(app: INestApplication): void {
  // Real-time notifications (Socket.IO) share the API's HTTP server and port.
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // credentials: true lets the browser send/receive the httpOnly refresh cookie cross-origin
  // (frontend on :5173, API on :4000 in dev). Content-Disposition is exposed so the frontend can
  // read the file name of a download (research exports, submission files).
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Retry-After'],
  });

  // Behind proxies, the client IP (used for rate limiting) is in X-Forwarded-For. TRUST_PROXY_HOPS =
  // how many proxies sit in front of the API: 1 for Render or Caddy alone, 2 for Vercel's /api
  // rewrite in front of Render. Too few and every user shares the proxy's IP (and rate limit).
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? 1 : 0));
  if (hops > 0) (app as NestExpressApplication).set('trust proxy', hops);

  // Security headers. The API only serves JSON and file downloads, so the strictest CSP is fine;
  // cross-origin resource policy is relaxed so the frontend (another origin) can fetch downloads.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CSRF protection for the cookie-authenticated /auth routes (see the middleware).
  app.use(authOriginCheck);

  // Refresh tokens live in an httpOnly cookie — needs the parser wired up
  // before any route reads req.cookies.
  app.use(cookieParser());

  // Strips unknown fields and rejects requests that don't match a DTO's
  // shape/types — the class-validator layer.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
