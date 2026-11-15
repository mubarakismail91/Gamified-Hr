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

  // CORS, cookie parser and the global ValidationPipe (shared with the API tests).
  configureApp(app);

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
