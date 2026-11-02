import { apiClient } from "./client";
import type { Bi, Badge, SkillNode } from "@/data";

export interface ProfileKudo {
  id: string;
  value: "collaboration" | "excellence" | "initiative" | "mentorship" | "service" | "integrity";
  message: Bi;
  at: Date;
  from: { id: string; name: Bi; initials: string; avatarTone: string };
}

/** A colleague's profile as anyone signed in may see it. Read-only: there is no matching write endpoint. */
export interface PublicProfile {
  id: string;
  isSelf: boolean;
  name: Bi;
  initials: string;
  title: Bi;
  department: Bi;
  college: Bi;
  role: "employee" | "manager" | "admin";
  avatarTone: string;
  joined: Date;
  hasEngagement: boolean;
  totalXp: number;
  kudosReceived: number;
  questsCompleted: number | null;
  badges: (Badge & { earnedOn: Date })[] | null;
  totalBadges: number;
  skills: SkillNode[] | null;
  recentKudos: ProfileKudo[];
  contact: { email: string; staffId: string; office: Bi } | null;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const res = await apiClient.get<PublicProfile>(`/profiles/${userId}`);
  return res.data;
}
