import { apiClient } from "./client";
import type { SkillNode, SkillPath } from "@/data";

/** The catalog with the signed-in user's own level/state on each skill. */
export async function listSkills(): Promise<SkillNode[]> {
  const res = await apiClient.get<SkillNode[]>("/skills");
  return res.data;
}

export async function listSkillPaths(): Promise<SkillPath[]> {
  const res = await apiClient.get<SkillPath[]>("/skills/paths");
  return res.data;
}

export async function followSkillPath(branch: SkillPath["branch"]): Promise<SkillPath[]> {
  const res = await apiClient.post<SkillPath[]>("/skills/paths", { branch });
  return res.data;
}
