import type { StaffMemberDto } from '../../common/dto/staff-member.dto';

/** Mirrors the frontend's RankedRow (src/store/selectors.ts). */
export interface LeaderboardEntryDto {
  staffId: string;
  points: number;
  progress: number;
  /** Always 0 — real rank-change history isn't tracked yet, unlike the demo's flavour-only deltas. */
  deltaRank: number;
  position: number;
  staff: StaffMemberDto;
}

export interface TopPerformerDto {
  staff: StaffMemberDto;
  points: number;
}

export interface TopDepartmentDto {
  departmentId: string;
  department: { en: string; ar: string };
  avgPoints: number;
  employeeCount: number;
}

export interface MostImprovedDto {
  staff: StaffMemberDto;
  progress: number;
}
