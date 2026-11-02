import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as surveyApi from "@/api/surveyApi";

export function useSurveyRoundsQuery() {
  return useQuery({
    queryKey: ["surveys", "rounds"] as const,
    queryFn: surveyApi.listSurveyRounds,
  });
}

export function useQuestionBankQuery() {
  return useQuery({
    queryKey: ["surveys", "question-bank"] as const,
    queryFn: surveyApi.getQuestionBank,
    staleTime: Infinity,
  });
}

export function useSdtScoresQuery(roundId?: string) {
  return useQuery({
    queryKey: ["surveys", "scores", roundId ?? "latest"] as const,
    queryFn: () => surveyApi.getSdtScores(roundId),
  });
}

export function useActiveSurveysQuery() {
  return useQuery({
    queryKey: ["surveys", "active"] as const,
    queryFn: surveyApi.listActiveSurveys,
  });
}

export function useCreateSurveyRoundMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: surveyApi.createSurveyRound,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
}

export function useSubmitSurveyResponseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, answers }: { roundId: string; answers: Record<string, number> }) =>
      surveyApi.submitSurveyResponse(roundId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
}
