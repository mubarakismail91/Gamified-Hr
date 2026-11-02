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

export interface DemographicsDto {
  byGender: DemographicRowDto[];
}
