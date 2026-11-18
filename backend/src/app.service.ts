import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

const startedAt = Date.now();

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'IU Gamified HR API';
  }

  /** For the host's health check and uptime monitors: the API is up AND can reach the database. */
  async health(): Promise<{ status: 'ok' | 'degraded'; database: 'ok' | 'unreachable'; uptimeSeconds: number }> {
    let database: 'ok' | 'unreachable' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'unreachable';
    }
    return { status: database === 'ok' ? 'ok' : 'degraded', database, uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) };
  }
}
