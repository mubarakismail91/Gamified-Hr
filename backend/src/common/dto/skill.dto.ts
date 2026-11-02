import type { Bi } from './staff-member.dto';

/** Mirrors the frontend's SkillNode (src/data/types.ts). */
export interface SkillDto {
  id: string;
  name: Bi;
  branch: 'teaching' | 'research' | 'leadership' | 'digital';
  description: Bi;
  state: 'unlocked' | 'in-progress' | 'locked';
  level: number;
  maxLevel: number;
  requires?: string[];
  col: number;
  row: number;
}
