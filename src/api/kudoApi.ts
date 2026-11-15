import { apiClient } from "./client";
import type { Bi, StaffMember } from "@/data";

export interface KudoEntry {
  id: string;
  fromId: string;
  toId: string;
  value: "collaboration" | "excellence" | "initiative" | "mentorship" | "service" | "integrity";
  message: Bi;
  at: Date;
  fromStaff: StaffMember;
  toStaff: StaffMember;
}

export interface SendKudoInput {
  toUserId: string;
  value: KudoEntry["value"];
  message: string;
}

/** The latest Kudos (server default 50); `received` = only those sent to the signed-in person. */
export async function listKudos(opts: { limit?: number; received?: boolean } = {}): Promise<KudoEntry[]> {
  const res = await apiClient.get<KudoEntry[]>("/kudos", {
    params: { ...(opts.limit ? { limit: opts.limit } : {}), ...(opts.received ? { received: true } : {}) },
  });
  return res.data;
}

/** How many Kudos the signed-in person has received. */
export async function getReceivedCount(): Promise<number> {
  const res = await apiClient.get<{ count: number }>("/kudos/received-count");
  return res.data.count;
}

export async function sendKudo(input: SendKudoInput): Promise<void> {
  await apiClient.post("/kudos", input);
}
