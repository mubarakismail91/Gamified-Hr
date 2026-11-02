import { PrismaService } from '../../prisma/prisma.service';

/**
 * "This week" / "this month" are never stored columns (see the schema
 * review) — they're computed from ActivityLog at request time so they can
 * never go stale. Calendar week starts Monday 00:00 local time; calendar
 * month starts the 1st 00:00.
 */
export interface PeriodXpStats {
  pointsThisWeek: number;
  pointsThisMonth: number;
  xpGainedThisMonth: number;
}

/** For list views that don't render period stats and shouldn't pay for computing them per row. */
export const ZERO_PERIOD_STATS: PeriodXpStats = { pointsThisWeek: 0, pointsThisMonth: 0, xpGainedThisMonth: 0 };

function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Batched version of getPeriodXpStats for list views (e.g. the leaderboard) — one groupBy per period instead of one aggregate per user. */
export async function getPeriodXpStatsBatch(
  prisma: PrismaService,
  userIds: string[],
): Promise<Map<string, PeriodXpStats>> {
  const now = new Date();
  const [weekRows, monthRows] = await Promise.all([
    prisma.activityLog.groupBy({
      by: ['userId'],
      _sum: { xpDelta: true },
      where: { userId: { in: userIds }, createdAt: { gte: startOfWeek(now) } },
    }),
    prisma.activityLog.groupBy({
      by: ['userId'],
      _sum: { xpDelta: true },
      where: { userId: { in: userIds }, createdAt: { gte: startOfMonth(now) } },
    }),
  ]);

  const weekMap = new Map(weekRows.map((r) => [r.userId, r._sum.xpDelta ?? 0]));
  const monthMap = new Map(monthRows.map((r) => [r.userId, r._sum.xpDelta ?? 0]));

  const result = new Map<string, PeriodXpStats>();
  for (const id of userIds) {
    const pointsThisMonth = monthMap.get(id) ?? 0;
    result.set(id, { pointsThisWeek: weekMap.get(id) ?? 0, pointsThisMonth, xpGainedThisMonth: pointsThisMonth });
  }
  return result;
}

export async function getPeriodXpStats(prisma: PrismaService, userId: string): Promise<PeriodXpStats> {
  const now = new Date();
  const [weekSum, monthSum] = await Promise.all([
    prisma.activityLog.aggregate({
      _sum: { xpDelta: true },
      where: { userId, createdAt: { gte: startOfWeek(now) } },
    }),
    prisma.activityLog.aggregate({
      _sum: { xpDelta: true },
      where: { userId, createdAt: { gte: startOfMonth(now) } },
    }),
  ]);

  const pointsThisMonth = monthSum._sum.xpDelta ?? 0;
  return {
    pointsThisWeek: weekSum._sum.xpDelta ?? 0,
    pointsThisMonth,
    // The demo tracked these as two separate numbers (a "best progress" boost
    // vs. raw points) but only ever populated them with the same seed value's
    // derivation — xpGainedThisMonth is really just this month's total here.
    xpGainedThisMonth: pointsThisMonth,
  };
}
