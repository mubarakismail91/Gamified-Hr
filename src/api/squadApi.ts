import { apiClient } from "./client";
import type { Bi, Role } from "@/data";

export interface SquadPerson {
  id: string;
  name: Bi;
  initials: string;
  avatarTone: string;
  department: Bi;
}

export interface Squad {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: { id: string; name: Bi; role: Role };
  members: { user: SquadPerson; status: "invited" | "active"; joinedAt: Date | null }[];
  activeCount: number;
  ranked: boolean;
  canManage: boolean;
}

export interface MySquads {
  squad: Squad | null;
  invites: Squad[];
}

export interface SquadLeaderboardRow {
  position: number;
  squadId: string;
  name: string;
  memberCount: number;
  departmentCount: number;
  totalXp: number;
  avgXp: number;
  members: SquadPerson[];
  isMine: boolean;
}

export type ChallengeMetric = "quests_completed" | "xp_earned";

export interface Challenge {
  id: string;
  title: Bi;
  description: Bi;
  metric: ChallengeMetric;
  target: number;
  bonusXp: number;
  startsAt: Date;
  endsAt: Date;
  status: "upcoming" | "active" | "ended";
  squadsJoined: number;
  squadsCompleted: number;
  mine: { joined: boolean; progress: number; completedAt: Date | null } | null;
}

export interface CreateChallengeInput {
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  metric: ChallengeMetric;
  target: number;
  bonusXp: number;
  startsAt: string;
  endsAt: string;
}

/** Rules mirrored from the backend (squad-rules.ts). */
export const MIN_RANKED_MEMBERS = 3;
export const MAX_SQUAD_SIZE = 6;

export const getMySquads = async () => (await apiClient.get<MySquads>("/squads/mine")).data;
export const listSquads = async () => (await apiClient.get<Squad[]>("/squads")).data;
export const listCandidates = async () => (await apiClient.get<SquadPerson[]>("/squads/candidates")).data;
export const getSquadLeaderboard = async (period: "week" | "month") =>
  (await apiClient.get<SquadLeaderboardRow[]>("/squads/leaderboard", { params: { period } })).data;
export const createSquad = async (input: { name: string; memberIds: string[] }) =>
  (await apiClient.post<Squad>("/squads", input)).data;
export const addSquadMember = async (squadId: string, userId: string) =>
  (await apiClient.post<Squad>(`/squads/${squadId}/members`, { userId })).data;
export const respondToInvite = async (squadId: string, accept: boolean) =>
  (await apiClient.post<MySquads>(`/squads/${squadId}/invite/${accept ? "accept" : "decline"}`)).data;
export const removeSquadMember = async (squadId: string, userId: string) =>
  (await apiClient.delete<{ disbanded: boolean }>(`/squads/${squadId}/members/${userId}`)).data;
export const disbandSquad = async (squadId: string) => {
  await apiClient.delete(`/squads/${squadId}`);
};
export const listChallenges = async () => (await apiClient.get<Challenge[]>("/squads/challenges")).data;
export const createChallenge = async (input: CreateChallengeInput) =>
  (await apiClient.post<Challenge>("/squads/challenges", input)).data;
export const joinChallenge = async (id: string) => (await apiClient.post<Challenge>(`/squads/challenges/${id}/join`)).data;
