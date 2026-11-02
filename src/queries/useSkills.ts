import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as skillApi from "@/api/skillApi";

// Skill levels are derived from the user's completed quests, so there's no long cache here —
// approving a quest invalidates ["skills"] (see useAssignments) and a revisit refetches.
export function useSkillsQuery() {
  return useQuery({
    queryKey: ["skills"] as const,
    queryFn: skillApi.listSkills,
  });
}

export function useSkillPathsQuery() {
  return useQuery({
    queryKey: ["skills", "paths"] as const,
    queryFn: skillApi.listSkillPaths,
  });
}

export function useFollowSkillPathMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: skillApi.followSkillPath,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });
}
