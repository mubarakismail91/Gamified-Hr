import { apiClient } from "./client";
import type { SkillNode } from "@/data";

export async function listSkills(): Promise<SkillNode[]> {
  const res = await apiClient.get<SkillNode[]>("/skills");
  return res.data;
}
