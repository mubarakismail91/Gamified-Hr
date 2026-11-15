import { availableParallelism } from 'os';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

// Password hashing (bcrypt) runs on libuv's thread pool, which has only 4 threads by default.
// Use one per CPU core so a sign-in rush can use the whole machine (load test, item 8).
// Must be set before the pool's first use; nothing above this line uses it.
process.env.UV_THREADPOOL_SIZE ??= String(Math.max(4, availableParallelism()));

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS, cookie parser and the global ValidationPipe (shared with the API tests).
  configureApp(app);

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
