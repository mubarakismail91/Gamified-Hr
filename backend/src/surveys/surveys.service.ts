import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { logAudit } from '../common/utils/audit.util';
import { CreateSurveyRoundDto } from './dto/create-survey-round.dto';
import { SubmitSurveyResponseDto } from './dto/submit-survey-response.dto';
import type { ActiveSurveyDto, SdtScoresResultDto, SurveyRoundDto, SurveyRoundStatus } from './dto/survey.dto';

const SURVEY_XP_BONUS = 20;
/** Below this many respondents, averages aren't reported — same principle the original plan flagged as non-negotiable for survey anonymity. */
const K_ANONYMITY_THRESHOLD = 5;

/** No question-editor exists in the frontend, so every round gets this fixed SDT pulse set (2 items per sub-scale). */
const STANDARD_QUESTIONS: { scale: 'autonomy' | 'competence' | 'relatedness'; textEn: string; textAr: string }[] = [
  {
    scale: 'autonomy',
    textEn: 'I feel I have real input into decisions that affect my work.',
    textAr: 'أشعر أن لي رأيًا حقيقيًا في القرارات التي تؤثر على عملي.',
  },
  {
    scale: 'autonomy',
    textEn: 'I can choose how I approach my day-to-day tasks.',
    textAr: 'أستطيع اختيار كيفية تنفيذ مهامي اليومية.',
  },
  {
    scale: 'competence',
    textEn: 'I feel confident and effective in the work I do.',
    textAr: 'أشعر بالثقة والفعالية في العمل الذي أقوم به.',
  },
  {
    scale: 'competence',
    textEn: 'I have opportunities to develop and use my skills.',
    textAr: 'تتوفر لي فرص لتطوير مهاراتي واستخدامها.',
  },
  {
    scale: 'relatedness',
    textEn: 'I feel a sense of belonging with my colleagues.',
    textAr: 'أشعر بانتماء حقيقي تجاه زملائي.',
  },
  {
    scale: 'relatedness',
    textEn: 'I feel supported by the people I work with.',
    textAr: 'أشعر بالدعم من الأشخاص الذين أعمل معهم.',
  },
];

const SCALE_LABEL: Record<string, { en: string; ar: string }> = {
  autonomy: { en: 'Autonomy', ar: 'الاستقلالية' },
  competence: { en: 'Competence', ar: 'الكفاءة' },
  relatedness: { en: 'Relatedness', ar: 'الانتماء' },
};

/** Never stored — derived from opensAt/closesAt vs. now() so it can't drift out of sync with the dates. */
function computeStatus(opensAt: Date, closesAt: Date | null, now: Date): SurveyRoundStatus {
  if (now < opensAt) return 'scheduled';
  if (closesAt && now > closesAt) return 'closed';
  return 'open';
}

@Injectable()
export class SurveysService {
  constructor(
    private prisma: PrismaService,
    private badges: BadgesService,
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
      quarter: r.quarter,
      status: computeStatus(r.opensAt, r.closesAt, now),
      responses: r._count.responses,
      target: r.targetCount,
      opens: r.opensAt,
    }));
  }

  /** `targetCount` snapshots the current eligible-Employee headcount — it's not recomputed once the round exists. */
  async createRound(dto: CreateSurveyRoundDto, actorId: string): Promise<SurveyRoundDto> {
    const targetCount = await this.prisma.user.count({ where: { role: 'employee', isActive: true } });

    const round = await this.prisma.surveyRound.create({
      data: {
        titleEn: dto.titleEn,
        titleAr: dto.titleAr || dto.titleEn,
        quarter: dto.quarter,
        opensAt: new Date(dto.opensAt),
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        targetCount,
        questions: {
          create: STANDARD_QUESTIONS.map((q, i) => ({
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
      metadata: { titleEn: round.titleEn, quarter: round.quarter },
    });

    return {
      id: round.id,
      title: { en: round.titleEn, ar: round.titleAr },
      quarter: round.quarter,
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
        quarter: r.quarter,
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
      if (!Number.isInteger(value) || value < 1 || value > 7) {
        throw new BadRequestException('Each answer must be an integer from 1 to 7.');
      }
    }

    await this.prisma.$transaction([
      this.prisma.surveyResponse.create({ data: { roundId, answers: dto.answers } }),
      this.prisma.surveyParticipation.create({ data: { roundId, userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { totalXp: { increment: SURVEY_XP_BONUS } } }),
      this.prisma.activityLog.create({
        data: {
          userId,
          kind: 'xp',
          textEn: `Completed survey: ${round.titleEn}`,
          textAr: `أكمل الاستبيان: ${round.titleAr}`,
          xpDelta: SURVEY_XP_BONUS,
          refType: 'SurveyRound',
          refId: round.id,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId,
          kind: 'xp',
          titleEn: `+${SURVEY_XP_BONUS} XP`,
          titleAr: `+${SURVEY_XP_BONUS} نقطة خبرة`,
          bodyEn: `Thanks for completing "${round.titleEn}".`,
          bodyAr: `شكرًا لإكمالك "${round.titleAr}".`,
        },
      }),
    ]);

    await this.badges.evaluate(userId);
  }

  /** The given round's averages, or the latest closed round's if none given. Suppressed under the k-anonymity threshold. */
  async getScores(roundId?: string): Promise<SdtScoresResultDto> {
    const round = roundId
      ? await this.prisma.surveyRound.findUnique({ where: { id: roundId } })
      : await this.prisma.surveyRound.findFirst({
          where: { closesAt: { lt: new Date() } },
          orderBy: { closesAt: 'desc' },
        });

    if (!round) return { scores: [], respondentCount: 0, suppressed: true };

    const [responses, questions] = await Promise.all([
      this.prisma.surveyResponse.findMany({ where: { roundId: round.id }, select: { answers: true } }),
      this.prisma.surveyQuestion.findMany({ where: { roundId: round.id } }),
    ]);

    const respondentCount = responses.length;
    if (respondentCount < K_ANONYMITY_THRESHOLD) {
      return { scores: [], respondentCount, suppressed: true };
    }

    const scaleById = new Map(questions.map((q) => [q.id, q.scale]));
    const sums: Record<string, { total: number; count: number }> = {
      autonomy: { total: 0, count: 0 },
      competence: { total: 0, count: 0 },
      relatedness: { total: 0, count: 0 },
    };

    for (const r of responses) {
      const answers = r.answers as unknown as Record<string, number>;
      for (const [questionId, value] of Object.entries(answers)) {
        const scale = scaleById.get(questionId);
        if (!scale) continue;
        sums[scale].total += value;
        sums[scale].count += 1;
      }
    }

    const scores = (['autonomy', 'competence', 'relatedness'] as const).map((scale) => ({
      scale: SCALE_LABEL[scale],
      score: sums[scale].count > 0 ? Math.round((sums[scale].total / sums[scale].count) * 10) / 10 : 0,
    }));

    return { scores, respondentCount, suppressed: false };
  }
}
