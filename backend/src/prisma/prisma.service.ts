import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Thin wrapper so Prisma's connection lifecycle is managed by Nest's DI
 * container instead of a module-level singleton — every other module just
 * injects `PrismaService` and calls `this.prisma.user.findMany()` etc.
 *
 * Prisma 7 requires a driver adapter for a direct database connection
 * (schema.prisma no longer carries the connection URL), so we build one
 * from DATABASE_URL via NestJS's own ConfigService.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    // Up to DB_POOL_SIZE (default 20) simultaneous database connections per API instance;
    // the driver's default of 10 queued requests under the load test (item 8).
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: Number(config.get('DB_POOL_SIZE') ?? 20),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
