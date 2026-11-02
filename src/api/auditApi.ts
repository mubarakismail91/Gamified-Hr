import { apiClient } from "./client";
import type { AuditEntry } from "@/data";

export async function listAuditEntries(limit?: number): Promise<AuditEntry[]> {
  const res = await apiClient.get<AuditEntry[]>("/audit", { params: limit ? { limit } : undefined });
  return res.data;
}
