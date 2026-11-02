import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Stored as JSON in Badge.criteria. A badge with `criteria = null` has no
 * automatic rule and can only be granted by an Administrator.
 */
export type BadgeCriteria =
  | { type: 'questsAccepted'; count: number }
  | { type: 'questsCompleted'; count: number; category?: { en: string; ar: string } }
  | { type: 'kudosReceived'; count: number; value?: string }
  | { type: 'xpWithinDays'; xp: number; days: number }
  | { type: 'workingDayStreak'; days: number };

export interface BadgeProgress {
  current: number;
  target: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function computeBadgeProgress(
  prisma: PrismaService,
  user: { id: string; createdAt: Date },
  criteria: BadgeCriteria,
): Promise<BadgeProgress> {
  switch (criteria.type) {
    case 'questsAccepted': {
      const current = await prisma.questAssignment.count({ where: { employeeId: user.id } });
      return { current, target: criteria.count };
    }

    case 'questsCompleted': {
      const questFilter: Prisma.QuestWhereInput | undefined = criteria.category
        ? {
            OR: [
              { categoryEn: { contains: criteria.category.en, mode: 'insensitive' } },
              { categoryAr: { contains: criteria.category.ar } },
            ],
          }
        : undefined;
      const current = await prisma.questAssignment.count({
        where: { employeeId: user.id, status: 'completed', ...(questFilter ? { quest: questFilter } : {}) },
      });
      return { current, target: criteria.count };
    }

    case 'kudosReceived': {
      const current = await prisma.kudo.count({
        where: { toUserId: user.id, ...(criteria.value ? { value: criteria.value as never } : {}) },
      });
      return { current, target: criteria.count };
    }

    case 'xpWithinDays': {
      const windowEnd = new Date(user.createdAt.getTime() + criteria.days * DAY_MS);
      const sum = await prisma.activityLog.aggregate({
        _sum: { xpDelta: true },
        where: { userId: user.id, createdAt: { lt: windowEnd } },
      });
      return { current: sum._sum.xpDelta ?? 0, target: criteria.xp };
    }

    case 'workingDayStreak': {
      const rows = await prisma.activityLog.findMany({ where: { userId: user.id }, select: { createdAt: true } });
      return { current: longestWorkingDayRun(rows.map((r) => r.createdAt)), target: criteria.days };
    }
  }
}

/** Longest run of consecutive working days (Sun–Thu; Fri/Sat are the weekend and never break a run) with any activity. */
function longestWorkingDayRun(timestamps: Date[]): number {
  const days = new Set<number>();
  for (const ts of timestamps) {
    const dayNumber = Math.floor(Date.UTC(ts.getFullYear(), ts.getMonth(), ts.getDate()) / DAY_MS);
    const weekday = new Date(dayNumber * DAY_MS).getUTCDay(); // 5 = Friday, 6 = Saturday
    if (weekday !== 5 && weekday !== 6) days.add(dayNumber);
  }

  const sorted = Array.from(days).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    run = prev !== null && nextWorkingDay(prev) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

function nextWorkingDay(dayNumber: number): number {
  let next = dayNumber + 1;
  for (;;) {
    const weekday = new Date(next * DAY_MS).getUTCDay();
    if (weekday !== 5 && weekday !== 6) return next;
    next += 1;
  }
}

export function progressPercent(p: BadgeProgress): number {
  if (p.target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((p.current / p.target) * 100)));
}
