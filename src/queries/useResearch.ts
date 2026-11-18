import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as researchApi from "@/api/researchApi";

export function useMyResearchConsentQuery(enabled = true) {
  return useQuery({ queryKey: ["research", "consent"] as const, queryFn: researchApi.getMyConsent, enabled });
}

export function useResearchStatusQuery() {
  return useQuery({ queryKey: ["research", "status"] as const, queryFn: researchApi.getResearchStatus });
}

export function useGiveConsentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: researchApi.giveConsent,
    onSuccess: (data) => qc.setQueryData(["research", "consent"], data),
  });
}

export function useWithdrawConsentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: researchApi.withdrawConsent,
    onSuccess: (data) => qc.setQueryData(["research", "consent"], data),
  });
}
