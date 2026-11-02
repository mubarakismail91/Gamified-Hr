import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as badgeApi from "@/api/badgeApi";
import type { MyBadge } from "@/api/badgeApi";

export type BadgeView = MyBadge;

export function useBadgesQuery() {
  return useQuery({
    queryKey: ["badges", "catalog"] as const,
    queryFn: badgeApi.listBadges,
    staleTime: 5 * 60 * 1000, // the catalog rarely changes
  });
}

export function useAwardBadgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, badgeId }: { userId: string; badgeId: string }) => badgeApi.awardBadge(userId, badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export const MAX_FEATURED_BADGES = 4;

export function useSetFeaturedBadgesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: badgeApi.setFeaturedBadges,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

/**
 * The signed-in Employee's gallery. Earned status and progress are computed by
 * the backend from real activity — and badges that just became earned are
 * granted as part of this request — so it's always re-fetched on mount.
 */
export function useMyBadges() {
  const query = useQuery({
    queryKey: ["badges", "mine"] as const,
    queryFn: badgeApi.listMyBadges,
    staleTime: 0,
  });
  const all = query.data ?? [];
  const earned = all.filter((b) => b.earned);
  const featuredIds = all
    .filter((b) => b.featuredOrder !== undefined)
    .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0))
    .map((b) => b.id);
  return { all, earned, featuredIds, earnedCount: earned.length, total: all.length, isLoading: query.isLoading };
}
