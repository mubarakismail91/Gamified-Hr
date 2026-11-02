import { apiClient } from "./client";
import type { Bi } from "@/data";

export interface AdminKpis {
  activeParticipants: number;
  totalEligible: number;
  participationRate: number;
  kudos30d: number;
  questsCompleted30d: number;
}

export interface ParticipationPoint {
  month: Bi;
  rate: number;
}

export interface XpByDepartment {
  department: Bi;
  avgXp: number;
}

export interface BadgeDistributionRow {
  tier: Bi;
  count: number;
}

export interface AnalyticsOverview {
  kpis: AdminKpis;
  participationTrend: ParticipationPoint[];
  xpByDepartment: XpByDepartment[];
  badgeDistribution: BadgeDistributionRow[];
}

export interface DemographicRow {
  key: Bi;
  value: number;
}

export interface Demographics {
  byGender: DemographicRow[];
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await apiClient.get<AnalyticsOverview>("/analytics/overview");
  return res.data;
}

export async function getDemographics(): Promise<Demographics> {
  const res = await apiClient.get<Demographics>("/analytics/demographics");
  return res.data;
}
