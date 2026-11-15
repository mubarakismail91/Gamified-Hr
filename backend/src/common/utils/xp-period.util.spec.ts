import { startOfMonth, startOfWeek } from './xp-period.util';

// Local-time dates, matching how the leaderboard periods are computed.
describe('leaderboard periods', () => {
  it('a week starts on Monday at midnight', () => {
    // Sunday 8 Nov 2026 belongs to the week that started Monday 2 Nov.
    expect(startOfWeek(new Date(2026, 10, 8, 15))).toEqual(new Date(2026, 10, 2));
    // Wednesday 4 Nov 2026 -> Monday 2 Nov.
    expect(startOfWeek(new Date(2026, 10, 4, 9))).toEqual(new Date(2026, 10, 2));
    // A Monday is its own week start.
    expect(startOfWeek(new Date(2026, 10, 2, 23, 59))).toEqual(new Date(2026, 10, 2));
  });

  it('a week can start in the previous month', () => {
    // Tuesday 1 Dec 2026 -> Monday 30 Nov 2026.
    expect(startOfWeek(new Date(2026, 11, 1, 10))).toEqual(new Date(2026, 10, 30));
  });

  it('a month starts on the 1st at midnight', () => {
    expect(startOfMonth(new Date(2026, 10, 15, 18))).toEqual(new Date(2026, 10, 1));
  });
});
