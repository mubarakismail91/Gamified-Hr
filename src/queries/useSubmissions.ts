import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitQuestWork } from "@/api/submissionApi";

export function useSubmitQuestWorkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, file, notes }: { assignmentId: string; file: File | null; notes: string }) =>
      submitQuestWork(assignmentId, file, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });
}
