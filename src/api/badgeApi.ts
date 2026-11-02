import { apiClient } from "./client";
import type { Badge } from "@/data";

export async function listBadges(): Promise<Badge[]> {
  const res = await apiClient.get<Badge[]>("/badges");
  return res.data;
}

export interface MyBadge extends Badge {
  earned: boolean;
  earnedOn?: Date;
  /** Position in the leaderboard showcase; absent = not featured. */
  featuredOrder?: number;
  /** 0-100 toward the requirement; absent once earned, and for Administrator-granted badges. */
  progressPct?: number;
  progressCurrent?: number;
  progressTarget?: number;
}

export async function listMyBadges(): Promise<MyBadge[]> {
  const res = await apiClient.get<MyBadge[]>("/badges/mine");
  return res.data;
}

export async function setFeaturedBadges(badgeIds: string[]): Promise<string[]> {
  const res = await apiClient.put<string[]>("/badges/featured", { badgeIds });
  return res.data;
}

export async function awardBadge(userId: string, badgeId: string): Promise<void> {
  await apiClient.post("/badges/award", { userId, badgeId });
}
