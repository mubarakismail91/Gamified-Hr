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

export async function listKudos(): Promise<KudoEntry[]> {
  const res = await apiClient.get<KudoEntry[]>("/kudos");
  return res.data;
}

export async function sendKudo(input: SendKudoInput): Promise<void> {
  await apiClient.post("/kudos", input);
}
