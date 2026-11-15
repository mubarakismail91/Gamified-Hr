import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as kudoApi from "@/api/kudoApi";

export function useKudosQuery() {
  return useQuery({
    queryKey: ["kudos"] as const,
    queryFn: () => kudoApi.listKudos(),
  });
}

export function useRecentKudosReceivedQuery(limit = 3) {
  return useQuery({ queryKey: ["kudos", "received", limit] as const, queryFn: () => kudoApi.listKudos({ limit, received: true }) });
}

export function useKudosReceivedCountQuery() {
  return useQuery({ queryKey: ["kudos", "received-count"] as const, queryFn: kudoApi.getReceivedCount });
}

export function useSendKudoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: kudoApi.sendKudo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kudos"] });
      // Sending Kudos awards the recipient XP and a notification.
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
