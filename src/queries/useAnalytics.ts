import { useQuery } from "@tanstack/react-query";
import * as analyticsApi from "@/api/analyticsApi";

export function useAnalyticsOverviewQuery() {
  return useQuery({
    queryKey: ["analytics", "overview"] as const,
    queryFn: analyticsApi.getAnalyticsOverview,
  });
}

export function useDemographicsQuery() {
  return useQuery({
    queryKey: ["analytics", "demographics"] as const,
    queryFn: analyticsApi.getDemographics,
  });
}
