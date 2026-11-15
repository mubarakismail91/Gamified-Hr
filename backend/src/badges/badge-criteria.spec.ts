import { computeBadgeProgress, longestWorkingDayRun, progressPercent } from './badge-criteria';
import type { PrismaService } from '../prisma/prisma.service';

// November 2026: Sun 1, Mon 2, Tue 3, Wed 4, Thu 5, Fri 6, Sat 7, Sun 8, Mon 9 ...
// Dates are built with the local-time constructor because the streak logic
// reads local calendar days, so these tests pass in any time zone.
const nov = (day: number, hour = 10) => new Date(2026, 10, day, hour);

describe('longestWorkingDayRun (working-day streak badge)', () => {
  it('is 0 with no activity', () => {
    expect(longestWorkingDayRun([])).toBe(0);
  });

  it('counts a full Sunday–Thursday working week as 5', () => {
    expect(longestWorkingDayRun([nov(1), nov(2), nov(3), nov(4), nov(5)])).toBe(5);
  });

  it('does not let the Friday/Saturday weekend break a run', () => {
    expect(longestWorkingDayRun([nov(4), nov(5), nov(8), nov(9)])).toBe(4);
  });

  it('breaks the run when a working day is skipped', () => {
    expect(longestWorkingDayRun([nov(2), nov(4)])).toBe(1);
  });

  it('counts several actions on the same day once', () => {
    expect(longestWorkingDayRun([nov(2, 8), nov(2, 12), nov(2, 16)])).toBe(1);
  });

  it('ignores weekend-only activity', () => {
    expect(longestWorkingDayRun([nov(6), nov(7)])).toBe(0);
  });

  it('does not depend on input order and keeps the longest run', () => {
    const shuffled = [nov(12), nov(2), nov(10), nov(3), nov(11), nov(9)];
    // Mon 2 – Tue 3 is a run of 2; Mon 9 – Thu 12 is a run of 4.
    expect(longestWorkingDayRun(shuffled)).toBe(4);
  });
});

describe('progressPercent', () => {
  it.each([
    [{ current: 0, target: 0 }, 0],
    [{ current: 3, target: 4 }, 75],
    [{ current: 1, target: 3 }, 33],
    [{ current: 10, target: 4 }, 100],
    [{ current: -2, target: 4 }, 0],
  ])('%o -> %i%%', (progress, expected) => {
    expect(progressPercent(progress)).toBe(expected);
  });
});

describe('computeBadgeProgress', () => {
  const user = { id: 'u1', createdAt: new Date('2026-11-01T00:00:00Z') };

  function fakePrisma() {
    return {
      questAssignment: { count: jest.fn().mockResolvedValue(3) },
      kudo: { count: jest.fn().mockResolvedValue(7) },
      activityLog: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { xpDelta: null } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  }

  it('questsAccepted counts every assignment of the user', async () => {
    const prisma = fakePrisma();
    const p = await computeBadgeProgress(prisma as unknown as PrismaService, user, { type: 'questsAccepted', count: 5 });
    expect(p).toEqual({ current: 3, target: 5 });
    expect(prisma.questAssignment.count).toHaveBeenCalledWith({ where: { employeeId: 'u1' } });
  });

  it('questsCompleted only counts completed quests, filtered by category when given', async () => {
    const prisma = fakePrisma();
    await computeBadgeProgress(prisma as unknown as PrismaService, user, {
      type: 'questsCompleted',
      count: 3,
      category: { en: 'Research', ar: 'بحث' },
    });
    const where = prisma.questAssignment.count.mock.calls[0][0].where;
    expect(where.status).toBe('completed');
    expect(where.quest.OR).toHaveLength(2);
  });

  it('kudosReceived can be limited to one value', async () => {
    const prisma = fakePrisma();
    const p = await computeBadgeProgress(prisma as unknown as PrismaService, user, {
      type: 'kudosReceived',
      count: 10,
      value: 'mentorship',
    });
    expect(p).toEqual({ current: 7, target: 10 });
    expect(prisma.kudo.count).toHaveBeenCalledWith({ where: { toUserId: 'u1', value: 'mentorship' } });
  });

  it('xpWithinDays sums XP earned before the window closes, treating no rows as 0', async () => {
    const prisma = fakePrisma();
    const p = await computeBadgeProgress(prisma as unknown as PrismaService, user, {
      type: 'xpWithinDays',
      xp: 500,
      days: 30,
    });
    expect(p).toEqual({ current: 0, target: 500 });
    const windowEnd: Date = prisma.activityLog.aggregate.mock.calls[0][0].where.createdAt.lt;
    expect(windowEnd.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('workingDayStreak uses the activity log timestamps', async () => {
    const prisma = fakePrisma();
    prisma.activityLog.findMany.mockResolvedValue([{ createdAt: nov(2) }, { createdAt: nov(3) }]);
    const p = await computeBadgeProgress(prisma as unknown as PrismaService, user, { type: 'workingDayStreak', days: 5 });
    expect(p).toEqual({ current: 2, target: 5 });
  });
});
