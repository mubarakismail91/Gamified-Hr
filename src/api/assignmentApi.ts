import { apiClient } from "./client";
import type { UserQuest, StaffMember, Quest, QuestSubmission } from "@/data";

export interface PendingApproval {
  quest: Quest;
  progress: UserQuest;
  user: StaffMember;
  submission?: QuestSubmission;
}

export interface SubmissionHistoryRow {
  submission: QuestSubmission;
  quest: Quest;
  user: StaffMember;
}

export async function listMyAssignments(): Promise<UserQuest[]> {
  const res = await apiClient.get<UserQuest[]>("/assignments/mine");
  return res.data;
}

export async function acceptQuest(questId: string): Promise<UserQuest> {
  const res = await apiClient.post<UserQuest>("/assignments", { questId });
  return res.data;
}

export async function advanceQuestStep(assignmentId: string): Promise<UserQuest> {
  const res = await apiClient.patch<UserQuest>(`/assignments/${assignmentId}/advance`);
  return res.data;
}

export async function toggleSubtask(assignmentId: string, subtaskId: string): Promise<UserQuest> {
  const res = await apiClient.patch<UserQuest>(`/assignments/${assignmentId}/subtasks/${subtaskId}`);
  return res.data;
}

export async function approveAssignment(assignmentId: string): Promise<UserQuest> {
  const res = await apiClient.post<UserQuest>(`/assignments/${assignmentId}/approve`);
  return res.data;
}

export async function rejectAssignment(assignmentId: string, note?: string): Promise<UserQuest> {
  const res = await apiClient.post<UserQuest>(`/assignments/${assignmentId}/reject`, { note });
  return res.data;
}

/** `departmentId` omitted = Manager's own department (server-enforced) or Admin's "all departments". */
export async function listPendingApprovals(departmentId?: string | null): Promise<PendingApproval[]> {
  const res = await apiClient.get<PendingApproval[]>("/assignments/pending", {
    params: departmentId ? { departmentId } : undefined,
  });
  return res.data;
}

export async function listSubmissionHistory(departmentId?: string | null): Promise<SubmissionHistoryRow[]> {
  const res = await apiClient.get<SubmissionHistoryRow[]>("/assignments/history", {
    params: departmentId ? { departmentId } : undefined,
  });
  return res.data;
}
