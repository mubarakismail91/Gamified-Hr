import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as assignmentApi from "@/api/assignmentApi";

export function useMyAssignmentsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["assignments", "mine"],
    queryFn: assignmentApi.listMyAssignments,
    enabled: options?.enabled ?? true,
  });
}

export function usePendingApprovalsQuery(departmentId?: string | null) {
  return useQuery({
    queryKey: ["assignments", "pending", departmentId ?? "own"],
    queryFn: () => assignmentApi.listPendingApprovals(departmentId),
  });
}

export function useSubmissionHistoryQuery(departmentId?: string | null) {
  return useQuery({
    queryKey: ["assignments", "history", departmentId ?? "own"],
    queryFn: () => assignmentApi.listSubmissionHistory(departmentId),
  });
}

/**
 * Every assignment-related mutation invalidates broadly (mine/pending/history,
 * plus users) — the exact cache each role is looking at varies, and this data
 * set is small enough that refetching everything is simpler and safer than
 * tracking which caches a given action could touch. Users is included because
 * approving an assignment awards XP, which the Team roster / Users table read
 * from that same cache.
 */
function useInvalidateAssignments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["assignments"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["badges"] });
    queryClient.invalidateQueries({ queryKey: ["skills"] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useAcceptQuestMutation() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: assignmentApi.acceptQuest,
    onSuccess: invalidate,
  });
}

export function useAdvanceQuestMutation() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: assignmentApi.advanceQuestStep,
    onSuccess: invalidate,
  });
}

export function useToggleSubtaskMutation() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: ({ assignmentId, subtaskId }: { assignmentId: string; subtaskId: string }) =>
      assignmentApi.toggleSubtask(assignmentId, subtaskId),
    onSuccess: invalidate,
  });
}

export function useApproveAssignmentMutation() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: assignmentApi.approveAssignment,
    onSuccess: invalidate,
  });
}

export function useRejectAssignmentMutation() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => assignmentApi.rejectAssignment(id, note),
    onSuccess: invalidate,
  });
}
