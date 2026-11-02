import { apiClient } from "./client";
import type { AppNotification } from "@/data";

export interface MyNotifications {
  items: AppNotification[];
  unreadCount: number;
}

export async function getMyNotifications(): Promise<MyNotifications> {
  const res = await apiClient.get<MyNotifications>("/notifications/mine");
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/notifications/read-all");
}
