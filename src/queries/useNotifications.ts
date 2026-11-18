import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as notificationApi from "@/api/notificationApi";
import { useRealtime } from "@/realtime/RealtimeContext";

export function useMyNotificationsQuery() {
  const { connected } = useRealtime();
  return useQuery({
    queryKey: ["notifications", "mine"] as const,
    queryFn: notificationApi.getMyNotifications,
    // New notifications are pushed over the live connection (RealtimeContext). Poll every 30 s
    // only while that connection is down, e.g. if a proxy blocks WebSockets.
    refetchInterval: connected ? false : 30_000,
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
