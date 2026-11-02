import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Bi } from '../common/dto/staff-member.dto';

/** Mirrors `ActivityItem` in the frontend (src/data/types.ts). */
export interface ActivityDto {
  id: string;
  userId: string;
  kind: 'xp' | 'badge' | 'quest' | 'kudo' | 'level';
  text: Bi;
  xp?: number;
  at: Date;
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  /** The caller's own recent activity, newest first. */
  async findMine(userId: string, limit = 30): Promise<ActivityDto[]> {
    const rows = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      kind: r.kind,
      text: { en: r.textEn, ar: r.textAr },
      xp: r.xpDelta || undefined,
      at: r.createdAt,
    }));
  }
}
