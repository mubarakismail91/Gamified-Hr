import { apiClient } from "./client";
import type { Quest, QuestDifficulty, QuestCadence } from "@/data";

export interface SubtaskInput {
  /** Present for an existing subtask so employees' ticks stay attached to it. */
  id?: string;
  titleEn: string;
  descriptionEn?: string;
}

export interface CreateQuestInput {
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  categoryEn?: string;
  categoryAr?: string;
  cadence: QuestCadence;
  difficulty?: QuestDifficulty;
  xp: number;
  steps?: number;
  /** ISO timestamp; `null` clears an existing deadline (update only). */
  dueAt?: string | null;
  requireFile?: boolean;
  status?: Quest["status"];
  departmentId?: string | null;
  assigneeId?: string;
  skillBranch?: Quest["skillBranch"];
  instructionsEn?: string;
  estimatedMinutes?: number;
  /** Replaces the whole checklist when provided. */
  subtasks?: SubtaskInput[];
}

export type UpdateQuestInput = Partial<CreateQuestInput>;

export async function listQuests(): Promise<Quest[]> {
  const res = await apiClient.get<Quest[]>("/quests");
  return res.data;
}

export async function createQuest(input: CreateQuestInput): Promise<Quest> {
  const res = await apiClient.post<Quest>("/quests", input);
  return res.data;
}

export async function updateQuest(id: string, patch: UpdateQuestInput): Promise<Quest> {
  const res = await apiClient.patch<Quest>(`/quests/${id}`, patch);
  return res.data;
}

export async function deleteQuest(id: string): Promise<void> {
  await apiClient.delete(`/quests/${id}`);
}

export async function uploadQuestAttachment(questId: string, file: File): Promise<Quest> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiClient.post<Quest>(`/quests/${questId}/attachments`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteQuestAttachment(questId: string, attachmentId: string): Promise<Quest> {
  const res = await apiClient.delete<Quest>(`/quests/${questId}/attachments/${attachmentId}`);
  return res.data;
}

/** Needs the Authorization header, so it's fetched as a blob rather than linked to directly. */
export async function fetchQuestAttachmentBlob(questId: string, attachmentId: string): Promise<Blob> {
  const res = await apiClient.get(`/quests/${questId}/attachments/${attachmentId}/file`, { responseType: "blob" });
  return res.data;
}
