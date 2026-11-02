import { apiClient } from "./client";
import type { ActivityItem } from "@/data";

/** The signed-in user's own recent activity, newest first. */
export async function listMyActivity(): Promise<ActivityItem[]> {
  const res = await apiClient.get<ActivityItem[]>("/activity/mine");
  return res.data;
}
