import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as questApi from "@/api/questApi";

export function useQuestsQuery() {
  return useQuery({
    queryKey: ["quests"],
    queryFn: questApi.listQuests,
  });
}

function useInvalidateQuests() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["quests"] });
}

export function useCreateQuestMutation() {
  const invalidate = useInvalidateQuests();
  return useMutation({
    mutationFn: questApi.createQuest,
    onSuccess: invalidate,
  });
}

export function useUpdateQuestMutation() {
  const invalidate = useInvalidateQuests();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: questApi.UpdateQuestInput }) => questApi.updateQuest(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteQuestMutation() {
  const invalidate = useInvalidateQuests();
  return useMutation({
    mutationFn: questApi.deleteQuest,
    onSuccess: invalidate,
  });
}

export function useUploadQuestAttachmentMutation() {
  const invalidate = useInvalidateQuests();
  return useMutation({
    mutationFn: ({ questId, file }: { questId: string; file: File }) => questApi.uploadQuestAttachment(questId, file),
    onSuccess: invalidate,
  });
}

export function useDeleteQuestAttachmentMutation() {
  const invalidate = useInvalidateQuests();
  return useMutation({
    mutationFn: ({ questId, attachmentId }: { questId: string; attachmentId: string }) =>
      questApi.deleteQuestAttachment(questId, attachmentId),
    onSuccess: invalidate,
  });
}
