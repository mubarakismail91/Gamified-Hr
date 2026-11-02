import { useQuery } from "@tanstack/react-query";
import * as activityApi from "@/api/activityApi";

/** Activity feed for the signed-in user. */
export function useMyActivity() {
  const query = useQuery({ queryKey: ["activity", "mine"] as const, queryFn: activityApi.listMyActivity });
  return query.data ?? [];
}
