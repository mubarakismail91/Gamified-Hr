import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getResearchKey, researchCode } from '../research/research-code';
import { PrismaService } from '../prisma/prisma.service';
import { logAudit } from '../common/utils/audit.util';
import { CreateSurveyRoundDto } from './dto/create-survey-round.dto';
import { DEFAULT_QUESTION_KEYS, SURVEY_QUESTION_BANK } from './survey-question-bank';
import { SubmitSurveyResponseDto } from './dto/submit-survey-response.dto';
import type {
  ActiveSurveyDto,
  SdtScale,
  SdtScoresByGroupDto,
  SdtScoresResultDto,
  SurveyRoundDto,
  SurveyRoundStatus,
} from './dto/survey.dto';
import { averageByScale, scoreGroups } from './sdt-scoring';
import { GROUPS_BY_DIMENSION, NOT_STATED, toResponseTag, type DemographicDimension } from '../common/demographics';

/** Below this many respondents, averages aren't reported — same principle the original plan flagged as non-negotiable for survey anonymity. */
export const K_ANONYMITY_THRESHOLD = 5;

/** Never stored — derived from opensAt/closesAt vs. now() so it can't drift out of sync with the dates. */
export function computeStatus(opensAt: Date, closesAt: Date | null, now: Date): SurveyRoundStatus {
  if (now < opensAt) return 'scheduled';
  if (closesAt && now > closesAt) return 'closed';
  return 'open';
}

@Injectable()
export class SurveysService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async findAllRounds(): Promise<SurveyRoundDto[]> {
    const rounds = await this.prisma.surveyRound.findMany({
      orderBy: { opensAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    });
    const now = new Date();
    return rounds.map((r) => ({
      id: r.id,
      title: { en: r.titleEn, ar: r.titleAr },
      status: computeStatus(r.opensAt, r.closesAt, now),
      responses: r._count.responses,
      target: r.targetCount,
      opens: r.opensAt,
    }));
  }

  getQuestionBank() {
    return SURVEY_QUESTION_BANK.map((q) => ({
      key: q.key,
      scale: q.scale,
      isDefault: !!q.isDefault,
      text: { en: q.textEn, ar: q.textAr },
    }));
  }

  /** `targetCount` snapshots the current eligible-Employee headcount — it's not recomputed once the round exists. */
  async createRound(dto: CreateSurveyRoundDto, actorId: string): Promise<SurveyRoundDto> {
    const keys = dto.questionKeys?.length ? [...new Set(dto.questionKeys)] : DEFAULT_QUESTION_KEYS;
    const picked = keys.map((k) => SURVEY_QUESTION_BANK.find((q) => q.key === k));
    if (picked.some((q) => !q)) throw new BadRequestException('Unknown survey question.');
    const questions = picked as NonNullable<(typeof picked)[number]>[];
    // Each SDT sub-scale needs at least one item, otherwise its average is meaningless.
    for (const scale of ['autonomy', 'competence', 'relatedness'] as const) {
      if (!questions.some((q) => q.scale === scale)) {
        throw new BadRequestException(`Pick at least one ${scale} question.`);
      }
    }

    const targetCount = await this.prisma.user.count({ where: { role: 'employee', isActive: true } });

    const round = await this.prisma.surveyRound.create({
      data: {
        titleEn: dto.titleEn,
        titleAr: dto.titleAr || dto.titleEn,
        opensAt: new Date(dto.opensAt),
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        targetCount,
        questions: {
          create: questions.map((q, i) => ({
            scale: q.scale,
            textEn: q.textEn,
            textAr: q.textAr,
            order: i,
          })),
        },
      },
    });

    await logAudit(this.prisma, {
      actorId,
      action: 'survey.created',
      targetType: 'SurveyRound',
      targetId: round.id,
      metadata: { titleEn: round.titleEn },
    });

    return {
      id: round.id,
      title: { en: round.titleEn, ar: round.titleAr },
      status: computeStatus(round.opensAt, round.closesAt, new Date()),
      responses: 0,
      target: round.targetCount,
      opens: round.opensAt,
    };
  }

  /** Currently-open rounds the viewer hasn't completed yet. */
  async findActiveForViewer(userId: string): Promise<ActiveSurveyDto[]> {
    const now = new Date();
    const rounds = await this.prisma.surveyRound.findMany({
      where: { opensAt: { lte: now }, OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
      include: { questions: { orderBy: { order: 'asc' } }, participation: { where: { userId } } },
    });

    return rounds
      .filter((r) => r.participation.length === 0)
      .map((r) => ({
        id: r.id,
        title: { en: r.titleEn, ar: r.titleAr },
        questions: r.questions.map((q) => ({ id: q.id, scale: q.scale, text: { en: q.textEn, ar: q.textAr } })),
      }));
  }

  async submitResponse(roundId: string, dto: SubmitSurveyResponseDto, userId: string): Promise<void> {
    const round = await this.prisma.surveyRound.findUnique({ where: { id: roundId }, include: { questions: true } });
    if (!round) throw new NotFoundException('Survey round not found.');

    if (computeStatus(round.opensAt, round.closesAt, new Date()) !== 'open') {
      throw new BadRequestException('This survey round is not currently open.');
    }

    const existing = await this.prisma.surveyParticipation.findUnique({
      where: { roundId_userId: { roundId, userId } },
    });
    if (existing) throw new BadRequestException("You've already completed this survey round.");

    const questionIds = new Set(round.questions.map((q) => q.id));
    const answerIds = Object.keys(dto.answers);
    if (answerIds.length !== questionIds.size || !answerIds.every((id) => questionIds.has(id))) {
      throw new BadRequestException("Answers don't match this round's questions.");
    }
    for (const value of Object.values(dto.answers)) {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new BadRequestException('Each answer must be an integer from 1 to 5.');
      }
    }

    // Copy the respondent's coarse group onto the response (no user id, no timestamp), so results can be
    // compared by group without the answers ever being linked back to a person.
    const respondent = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { generation: true, staffType: true },
    });

    // Research track (Track B): if this employee has consented, ALSO store a copy under their research
    // code (never their user id). The anonymous copy above is stored either way.
    const key = getResearchKey(this.config);
    const consented = key ? await this.prisma.researchConsent.findUnique({ where: { userId } }) : null;

    await this.prisma.$transaction([
      this.prisma.surveyResponse.create({
        data: {
          roundId,
          answers: dto.answers,
          generation: toResponseTag(respondent.generation),
          staffType: toResponseTag(respondent.staffType),
        },
      }),
      this.prisma.surveyParticipation.create({ data: { roundId, userId } }),
      ...(key && consented
        ? [this.prisma.researchResponse.create({ data: { code: researchCode(key, userId), roundId, answers: dto.answers } })]
        : []),
    ]);
  }

  /** The given round's averages, or the latest closed round's if none given. Suppressed under the k-anonymity threshold. */
  async getScores(roundId?: string): Promise<SdtScoresResultDto> {
    const round = await this.findRoundForScores(roundId);
    if (!round) return { scores: [], respondentCount: 0, suppressed: true };

    const [responses, scaleById] = await Promise.all([
      this.prisma.surveyResponse.findMany({ where: { roundId: round.id }, select: { answers: true } }),
      this.scaleByQuestionId(round.id),
    ]);

    const respondentCount = responses.length;
    if (respondentCount < K_ANONYMITY_THRESHOLD) {
      return { scores: [], respondentCount, suppressed: true };
    }
    return { scores: averageByScale(responses, scaleById), respondentCount, suppressed: false };
  }

  /**
   * The same averages split by generation or by job role, using the group tag stored on each
   * response. Small groups are suppressed (see scoreGroups for the rules), and nothing is
   * shown while the whole round is below the threshold.
   */
  async getScoresByGroup(dimension: DemographicDimension, roundId?: string): Promise<SdtScoresByGroupDto> {
    const round = await this.findRoundForScores(roundId);
    if (!round) return { dimension, respondentCount: 0, suppressed: true, groups: [] };

    const [responses, scaleById] = await Promise.all([
      this.prisma.surveyResponse.findMany({
        where: { roundId: round.id },
        select: { answers: true, generation: true, staffType: true },
      }),
      this.scaleByQuestionId(round.id),
    ]);

    const respondentCount = responses.length;
    if (respondentCount < K_ANONYMITY_THRESHOLD) {
      return { dimension, respondentCount, suppressed: true, groups: [] };
    }

    const tagOf = (r: (typeof responses)[number]): string | null => r[dimension];
    const groups = [
      ...GROUPS_BY_DIMENSION[dimension].map((g) => ({ ...g, responses: responses.filter((r) => tagOf(r) === g.key) })),
      { ...NOT_STATED, responses: responses.filter((r) => tagOf(r) === null) },
    ];
    return { dimension, respondentCount, suppressed: false, groups: scoreGroups(groups, scaleById, K_ANONYMITY_THRESHOLD) };
  }

  private findRoundForScores(roundId?: string) {
    return roundId
      ? this.prisma.surveyRound.findUnique({ where: { id: roundId } })
      : this.prisma.surveyRound.findFirst({
          where: { closesAt: { lt: new Date() } },
          orderBy: { closesAt: 'desc' },
        });
  }

  private async scaleByQuestionId(roundId: string): Promise<Map<string, SdtScale>> {
    const questions = await this.prisma.surveyQuestion.findMany({ where: { roundId } });
    return new Map(questions.map((q) => [q.id, q.scale as SdtScale]));
  }
}
