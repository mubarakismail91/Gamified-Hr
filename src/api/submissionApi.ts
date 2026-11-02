import { apiClient } from "./client";
import type { QuestSubmission } from "@/data";

export async function submitQuestWork(
  assignmentId: string,
  file: File | null,
  notes: string,
): Promise<QuestSubmission> {
  const form = new FormData();
  form.append("assignmentId", assignmentId);
  if (notes) form.append("notes", notes);
  if (file) form.append("file", file);

  const res = await apiClient.post<QuestSubmission>("/submissions", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * The download endpoint requires an Authorization header, so it can't be
 * used as a plain <img src>/<a href> — fetch it as a blob through the same
 * authenticated client instead, same pattern the old IndexedDB file store
 * replaced.
 */
export async function fetchSubmissionFileBlob(submissionId: string): Promise<Blob> {
  const res = await apiClient.get(`/submissions/${submissionId}/file`, { responseType: "blob" });
  return res.data;
}
