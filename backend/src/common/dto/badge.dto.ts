import type { Bi } from './staff-member.dto';

/** Mirrors `Badge` in the frontend's src/data/types.ts (the catalog entry — not the per-user earned view). */
export interface BadgeDto {
  id: string;
  name: Bi;
  description: Bi;
  howTo: Bi;
  group: Bi;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  /** true = no automatic rule; only an Administrator can grant it. */
  manual: boolean;
}

/** The catalog entry resolved for one Employee — earned or not, with real progress toward the requirement. */
export interface MyBadgeDto extends BadgeDto {
  earned: boolean;
  earnedOn?: Date;
  /** Position (0-based) in the Employee's leaderboard showcase; absent = not featured. */
  featuredOrder?: number;
  /** 0–100, only for badges that aren't earned yet and have an automatic rule. */
  progressPct?: number;
  progressCurrent?: number;
  progressTarget?: number;
}
