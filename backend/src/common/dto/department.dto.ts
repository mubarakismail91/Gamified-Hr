import type { Bi } from './staff-member.dto';

/** Mirrors `Department` in the frontend's src/data/types.ts. */
export interface DepartmentDto {
  id: string;
  name: Bi;
  managerId: string | null;
}
