import { apiClient } from "./client";
import type { Bi, StaffMember } from "@/data";

export type Period = "week" | "month";
export type Scope = "dept" | "uni";
export type Metric = "points" | "progress";

/** Sent as the literal departmentId value for "university-wide" — matches the backend's ALL_DEPARTMENTS sentinel. */
export const ALL_DEPARTMENTS = "__all__";

export interface LeaderboardEntry {
  staffId: string;
  points: number;
  progress: number;
  deltaRank: number;
  position: number;
  staff: StaffMember;
}

export interface TopPerformer {
  staff: StaffMember;
  points: number;
}

export interface TopDepartment {
  departmentId: string;
  department: Bi;
  avgPoints: number;
  employeeCount: number;
}

export interface MostImproved {
  staff: StaffMember;
  progress: number;
}

export async function getLeaderboard(opts: {
  period: Period;
  metric: Metric;
  scope?: Scope;
  departmentId?: string;
}): Promise<LeaderboardEntry[]> {
  const res = await apiClient.get<LeaderboardEntry[]>("/leaderboard", {
    params: { period: opts.period, metric: opts.metric, scope: opts.scope, departmentId: opts.departmentId },
  });
  return res.data;
}

export async function getTopPerformer(opts: { period: Period; departmentId?: string }): Promise<TopPerformer | null> {
  const res = await apiClient.get<TopPerformer | null>("/leaderboard/top-performer", {
    params: { period: opts.period, departmentId: opts.departmentId },
  });
  return res.data;
}

export async function getTopDepartments(opts: { period: Period; limit?: number }): Promise<TopDepartment[]> {
  const res = await apiClient.get<TopDepartment[]>("/leaderboard/top-departments", {
    params: { period: opts.period, limit: opts.limit },
  });
  return res.data;
}

export async function getMostImproved(opts: {
  period: Period;
  departmentId?: string;
}): Promise<MostImproved | null> {
  const res = await apiClient.get<MostImproved | null>("/leaderboard/most-improved", {
    params: { period: opts.period, departmentId: opts.departmentId },
  });
  return res.data;
}
