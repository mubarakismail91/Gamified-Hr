import type { Bi } from './staff-member.dto';

export type SkillBranchKey = 'teaching' | 'research' | 'leadership' | 'digital';

/** Mirrors the frontend's SkillNode (src/data/types.ts). `state`/`level` are the viewer's own progress. */
export interface SkillDto {
  id: string;
  name: Bi;
  branch: SkillBranchKey;
  description: Bi;
  state: 'unlocked' | 'in-progress' | 'locked';
  level: number;
  maxLevel: number;
  requires?: string[];
  col: number;
  row: number;
}

/** One skill path (branch) from the viewer's perspective. */
export interface SkillPathDto {
  branch: SkillBranchKey;
  followed: boolean;
  /** Completed quests on this path. */
  points: number;
  /** Levels available across the path (sum of its skills' maxLevel). */
  total: number;
}
