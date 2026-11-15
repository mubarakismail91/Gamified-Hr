import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
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
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

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
