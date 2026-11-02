import { useQuery } from "@tanstack/react-query";
import * as leaderboardApi from "@/api/leaderboardApi";
import type { Metric, Period, Scope } from "@/api/leaderboardApi";

export function useLeaderboardQuery(opts: { period: Period; metric: Metric; scope?: Scope; departmentId?: string }) {
  return useQuery({
    queryKey: ["leaderboard", opts.period, opts.metric, opts.scope ?? null, opts.departmentId ?? null] as const,
    queryFn: () => leaderboardApi.getLeaderboard(opts),
  });
}

export function useTopPerformerQuery(opts: { period: Period; departmentId?: string }, enabled = true) {
  return useQuery({
    queryKey: ["leaderboard", "top-performer", opts.period, opts.departmentId ?? null] as const,
    queryFn: () => leaderboardApi.getTopPerformer(opts),
    enabled,
  });
}

export function useTopDepartmentsQuery(opts: { period: Period; limit?: number }, enabled = true) {
  return useQuery({
    queryKey: ["leaderboard", "top-departments", opts.period, opts.limit ?? 3] as const,
    queryFn: () => leaderboardApi.getTopDepartments(opts),
    enabled,
  });
}

export function useMostImprovedQuery(opts: { period: Period; departmentId?: string }, enabled = true) {
  return useQuery({
    queryKey: ["leaderboard", "most-improved", opts.period, opts.departmentId ?? null] as const,
    queryFn: () => leaderboardApi.getMostImproved(opts),
    enabled,
  });
}
