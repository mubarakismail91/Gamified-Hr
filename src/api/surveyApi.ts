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
  opensAt: string;
  closesAt?: string;
  questionKeys?: string[];
}

export interface BankQuestion {
  key: string;
  scale: SdtScale;
  source: "wbns" | "pulse";
  isDefault: boolean;
  text: Bi;
}

export async function getQuestionBank(): Promise<BankQuestion[]> {
  const res = await apiClient.get<BankQuestion[]>("/surveys/question-bank");
  return res.data;
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
