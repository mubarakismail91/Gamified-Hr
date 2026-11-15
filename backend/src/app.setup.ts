import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

/**
 * Middleware and pipes shared by the real server (main.ts) and the API tests,
 * so the tests exercise exactly the same validation and cookie handling.
 */
export function configureApp(app: INestApplication): void {
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
