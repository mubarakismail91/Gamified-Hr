import { apiClient } from "./client";
import type { Bi, SurveyRound } from "@/data";

export type SdtScale = "autonomy" | "competence" | "relatedness";

export interface SurveyQuestion {
  id: string;
  scale: SdtScale;
  text: Bi;
}

export interface ActiveSurvey {
  id: string;
  title: Bi;
  quarter: string;
  questions: SurveyQuestion[];
}

export interface SdtScore {
  scale: Bi;
  score: number;
}

export interface SdtScoresResult {
  scores: SdtScore[];
  respondentCount: number;
  suppressed: boolean;
}

export interface CreateSurveyRoundInput {
  titleEn: string;
  titleAr?: string;
  quarter: string;
  opensAt: string;
  closesAt?: string;
}

export async function listSurveyRounds(): Promise<SurveyRound[]> {
  const res = await apiClient.get<SurveyRound[]>("/surveys");
  return res.data;
}

export async function createSurveyRound(input: CreateSurveyRoundInput): Promise<SurveyRound> {
  const res = await apiClient.post<SurveyRound>("/surveys", input);
  return res.data;
}

export async function getSdtScores(roundId?: string): Promise<SdtScoresResult> {
  const res = await apiClient.get<SdtScoresResult>("/surveys/scores", { params: roundId ? { roundId } : undefined });
  return res.data;
}

export async function listActiveSurveys(): Promise<ActiveSurvey[]> {
  const res = await apiClient.get<ActiveSurvey[]>("/surveys/active");
  return res.data;
}

export async function submitSurveyResponse(roundId: string, answers: Record<string, number>): Promise<void> {
  await apiClient.post(`/surveys/${roundId}/responses`, { answers });
}
