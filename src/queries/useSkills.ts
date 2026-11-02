import { useQuery } from "@tanstack/react-query";
import * as skillApi from "@/api/skillApi";

export function useSkillsQuery() {
  return useQuery({
    queryKey: ["skills"] as const,
    queryFn: skillApi.listSkills,
    staleTime: 5 * 60 * 1000, // the catalog rarely changes
  });
}
