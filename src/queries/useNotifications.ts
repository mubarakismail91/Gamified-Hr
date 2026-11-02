import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as notificationApi from "@/api/notificationApi";

export function useMyNotificationsQuery() {
  return useQuery({
    queryKey: ["notifications", "mine"] as const,
    queryFn: notificationApi.getMyNotifications,
    // No push/websocket channel exists yet — poll so a Manager/Employee
    // actually sees a new notification without navigating or refocusing the tab.
    refetchInterval: 30_000,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export function useMarkNotificationReadMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: notificationApi.markNotificationRead,
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsReadMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: notificationApi.markAllNotificationsRead,
    onSuccess: invalidate,
  });
}

/** Drop-in replacement for the old demo useMyNotifications hook (src/store/hooks.ts). */
export function useMyNotifications() {
  const query = useMyNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  return {
    items: query.data?.items ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}
