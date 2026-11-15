import type { Bi } from '../../common/dto/staff-member.dto';

export interface AdminKpisDto {
  activeParticipants: number;
  totalEligible: number;
  participationRate: number;
  kudos30d: number;
  questsCompleted30d: number;
}

export interface ParticipationPointDto {
  month: Bi;
  rate: number;
}

export interface XpByDepartmentDto {
  department: Bi;
  avgXp: number;
}

export interface BadgeDistributionDto {
  tier: Bi;
  count: number;
}

export interface AnalyticsOverviewDto {
  kpis: AdminKpisDto;
  participationTrend: ParticipationPointDto[];
  xpByDepartment: XpByDepartmentDto[];
  badgeDistribution: BadgeDistributionDto[];
}

export interface DemographicRowDto {
  key: Bi;
  value: number;
}

/** Engagement of one group. avgXp and participationRate are null (suppressed) when the group has fewer than 5 people. */
export interface EngagementRowDto {
  key: Bi;
  headcount: number;
  avgXp: number | null;
  participationRate: number | null;
  suppressed: boolean;
}

export interface DemographicsDto {
  byGender: DemographicRowDto[];
  /** Headcount per generation, plus "Prefer not to say" and "Not recorded". */
  byGeneration: DemographicRowDto[];
  /** Headcount per job role (academic/administrative), plus "Prefer not to say" and "Not recorded". */
  byStaffType: DemographicRowDto[];
  engagement: {
    generation: EngagementRowDto[];
    staffType: EngagementRowDto[];
  };
  minGroupSize: number;
}
