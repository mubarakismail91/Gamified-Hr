import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './submissions/multer.config';

async function bootstrap() {
  // Multer's diskStorage doesn't create its destination folder — first quest
  // submission would otherwise fail with ENOENT.
  mkdirSync(UPLOAD_DIR, { recursive: true });

  const app = await NestFactory.create(AppModule);

  // Refresh tokens live in an httpOnly cookie (see Phase B) — needs the parser
  // wired up before any route reads req.cookies.
  app.use(cookieParser());

  // credentials: true lets the browser send/receive the httpOnly refresh
  // cookie cross-origin (frontend on :5173, API on :4000 in dev).
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // Strips unknown fields and rejects requests that don't match a DTO's
  // shape/types — this is the "class-validator" layer the plan called for.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
