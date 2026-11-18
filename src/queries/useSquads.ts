import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as squadApi from "@/api/squadApi";

export const useMySquadsQuery = (enabled: boolean) =>
  useQuery({ queryKey: ["squads", "mine"] as const, queryFn: squadApi.getMySquads, enabled });
export const useSquadListQuery = (enabled: boolean) =>
  useQuery({ queryKey: ["squads", "all"] as const, queryFn: squadApi.listSquads, enabled });
export const useSquadCandidatesQuery = (enabled: boolean) =>
  useQuery({ queryKey: ["squads", "candidates"] as const, queryFn: squadApi.listCandidates, enabled });
export const useSquadLeaderboardQuery = (period: "week" | "month") =>
  useQuery({ queryKey: ["squads", "leaderboard", period] as const, queryFn: () => squadApi.getSquadLeaderboard(period) });
export const useChallengesQuery = () =>
  useQuery({ queryKey: ["squads", "challenges"] as const, queryFn: squadApi.listChallenges });

/** Every squad change can affect membership, candidates, the leaderboard and challenges, so refresh them all. */
function useSquadMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["squads"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export const useCreateSquadMutation = () => useSquadMutation(squadApi.createSquad);
export const useAddSquadMemberMutation = () =>
  useSquadMutation((a: { squadId: string; userId: string }) => squadApi.addSquadMember(a.squadId, a.userId));
export const useRespondToInviteMutation = () =>
  useSquadMutation((a: { squadId: string; accept: boolean }) => squadApi.respondToInvite(a.squadId, a.accept));
export const useRemoveSquadMemberMutation = () =>
  useSquadMutation((a: { squadId: string; userId: string }) => squadApi.removeSquadMember(a.squadId, a.userId));
export const useDisbandSquadMutation = () => useSquadMutation(squadApi.disbandSquad);
export const useCreateChallengeMutation = () => useSquadMutation(squadApi.createChallenge);
export const useJoinChallengeMutation = () => useSquadMutation(squadApi.joinChallenge);
