import { NestFactory } from '@nestjs/core';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { UPLOAD_DIR } from './submissions/multer.config';

async function bootstrap() {
  // Multer's diskStorage doesn't create its destination folder — first quest
  // submission would otherwise fail with ENOENT.
  mkdirSync(UPLOAD_DIR, { recursive: true });

  const app = await NestFactory.create(AppModule);

  // Cookie parser + global ValidationPipe (shared with the API tests).
  configureApp(app);

  // credentials: true lets the browser send/receive the httpOnly refresh
  // cookie cross-origin (frontend on :5173, API on :4000 in dev).
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
