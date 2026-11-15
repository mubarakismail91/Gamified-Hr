import { AppService } from './app.service';
import type { PrismaService } from './prisma/prisma.service';

describe('AppService health check', () => {
  it('reports ok when the database answers', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as unknown as PrismaService;
    expect(await new AppService(prisma).health()).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('reports degraded when the database is unreachable', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')) } as unknown as PrismaService;
    expect(await new AppService(prisma).health()).toMatchObject({ status: 'degraded', database: 'unreachable' });
  });
});
