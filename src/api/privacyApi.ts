import { apiClient } from "./client";
import type { Bi, Role } from "@/data";

export interface PrivacyPolicy {
  notificationsDays: number;
  deactivatedAccountsDays: number;
  revokedSessionsDays: number;
  jobEnabled: boolean;
  researchConsentVersion: string;
}

export interface DeactivatedUser {
  id: string;
  name: Bi;
  email: string | null;
  role: Role;
  deactivatedAt: Date | null;
  erasedAt: Date | null;
}

export interface RetentionRunResult {
  sessionsDeleted: number;
  notificationsDeleted: number;
  accountsAnonymised: number;
}

export const getPrivacyPolicy = async () => (await apiClient.get<PrivacyPolicy>("/privacy/policy")).data;
export const listDeactivated = async () => (await apiClient.get<DeactivatedUser[]>("/privacy/deactivated")).data;
export const eraseUser = async (userId: string) => (await apiClient.post(`/privacy/erase/${userId}`)).data;
export const runRetention = async () => (await apiClient.post<RetentionRunResult>("/privacy/retention/run")).data;

/** Right of access: the signed-in person's data as a JSON file, with the server's file name. */
export async function downloadMyData(): Promise<{ blob: Blob; fileName: string }> {
  const res = await apiClient.get("/privacy/my-data", { responseType: "blob" });
  const fileName = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? "my-data.json";
  return { blob: res.data as Blob, fileName };
}
