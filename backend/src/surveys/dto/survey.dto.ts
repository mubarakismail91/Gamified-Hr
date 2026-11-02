import type { Bi } from '../../common/dto/staff-member.dto';

export type SurveyRoundStatus = 'scheduled' | 'open' | 'closed';
export type SdtScale = 'autonomy' | 'competence' | 'relatedness';

/** Mirrors the frontend's SurveyRound (src/data/types.ts) — the admin list view. */
export interface SurveyRoundDto {
  id: string;
  title: Bi;
  status: SurveyRoundStatus;
  responses: number;
  target: number;
  opens: Date;
}

export interface SurveyQuestionDto {
  id: string;
  scale: SdtScale;
  text: Bi;
}

/** What an Employee sees for a round they haven't completed yet — no scores, no other respondents' data. */
export interface ActiveSurveyDto {
  id: string;
  title: Bi;
  questions: SurveyQuestionDto[];
}

export interface SdtScoreDto {
  scale: Bi;
  score: number;
}

/** k-anonymity applied: `scores` is empty and `suppressed` is true when respondentCount is below the threshold. */
export interface SdtScoresResultDto {
  scores: SdtScoreDto[];
  respondentCount: number;
  suppressed: boolean;
}
