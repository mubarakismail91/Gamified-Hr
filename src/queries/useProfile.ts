import { useQuery } from "@tanstack/react-query";
import * as profileApi from "@/api/profileApi";

export function usePublicProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["profiles", userId] as const,
    queryFn: () => profileApi.getPublicProfile(userId as string),
    enabled: !!userId,
    retry: false,
  });
}
