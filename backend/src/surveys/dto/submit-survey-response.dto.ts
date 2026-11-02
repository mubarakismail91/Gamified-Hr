import { IsObject } from 'class-validator';

export class SubmitSurveyResponseDto {
  /** { [questionId]: 1-5 } — validated against the round's actual questions in the service. */
  @IsObject()
  answers!: Record<string, number>;
}
