import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SurveysService } from '../surveys/surveys.service';
import { averageByScale } from '../surveys/sdt-scoring';
import { logAudit } from '../common/utils/audit.util';
import { toCsv, type CsvCell } from '../common/utils/csv.util';
import { CONSENT_VERSION, getResearchKey, researchCode } from './research-code';
import type { SdtScale } from '../surveys/dto/survey.dto';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

export interface MyConsentDto {
  /** false when RESEARCH_KEY isn't set — the study isn't running. */
  available: boolean;
  consented: boolean;
  consentedAt: Date | null;
  consentVersion: string;
}

export interface ResearchStatusDto {
  configured: boolean;
  participants: number;
  consentVersion: string;
}

export interface CsvExport {
  fileName: string;
  csv: string;
}

/**
 * Research track (Track B) and research exports, report Section 4.4.7.
 * Track A (anonymous pulse results) needs no consent and is exported only as aggregates.
 */
@Injectable()
export class ResearchService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private surveys: SurveysService,
  ) {}

  private requireKey(): string {
    const key = getResearchKey(this.config);
    if (!key) throw new ServiceUnavailableException('The research track is not configured (RESEARCH_KEY is not set).');
    return key;
  }

  async getMyConsent(userId: string): Promise<MyConsentDto> {
    const consent = await this.prisma.researchConsent.findUnique({ where: { userId } });
    return {
      available: getResearchKey(this.config) !== null,
      consented: consent !== null,
      consentedAt: consent?.consentedAt ?? null,
      consentVersion: consent?.consentVersion ?? CONSENT_VERSION,
    };
  }

  async giveConsent(userId: string): Promise<MyConsentDto> {
    this.requireKey();
    await this.prisma.researchConsent.upsert({
      where: { userId },
      create: { userId, consentVersion: CONSENT_VERSION },
      update: {},
    });
    await logAudit(this.prisma, {
      actorId: userId,
      action: 'research.consentGiven',
      targetType: 'User',
      targetId: userId,
      metadata: { consentVersion: CONSENT_VERSION },
    });
    return this.getMyConsent(userId);
  }

  /** Withdrawal deletes the consent AND every survey answer linked to the person's code. */
  async withdrawConsent(userId: string): Promise<MyConsentDto> {
    const key = this.requireKey();
    const code = researchCode(key, userId);
    const [deleted] = await this.prisma.$transaction([
      this.prisma.researchResponse.deleteMany({ where: { code } }),
      this.prisma.researchConsent.deleteMany({ where: { userId } }),
    ]);
    await logAudit(this.prisma, {
      actorId: userId,
      action: 'research.consentWithdrawn',
      targetType: 'User',
      targetId: userId,
      metadata: { deletedResponses: deleted.count },
    });
    return this.getMyConsent(userId);
  }

  async status(): Promise<ResearchStatusDto> {
    return {
      configured: getResearchKey(this.config) !== null,
      participants: await this.prisma.researchConsent.count(),
      consentVersion: CONSENT_VERSION,
    };
  }

  /**
   * Track B, pseudonymised: one row per participant per survey round they answered after consenting
   * (or one row with empty survey columns if they haven't answered any yet). Activity is measured at
   * export time. No names, emails, departments or user ids.
   */
  async exportParticipants(actorId: string): Promise<CsvExport> {
    const key = this.requireKey();
    const consents = await this.prisma.researchConsent.findMany({
      include: { user: { select: { id: true, generation: true, staffType: true, totalXp: true } } },
    });
    const since90 = new Date(Date.now() - NINETY_DAYS_MS);

    const rows: CsvCell[][] = [];
    for (const c of consents) {
      const u = c.user;
      const code = researchCode(key, u.id);
      const [accepted, completed, kudosSent, kudosReceived, badges, activity, linked] = await Promise.all([
        this.prisma.questAssignment.count({ where: { employeeId: u.id } }),
        this.prisma.questAssignment.count({ where: { employeeId: u.id, status: 'completed' } }),
        this.prisma.kudo.count({ where: { fromUserId: u.id } }),
        this.prisma.kudo.count({ where: { toUserId: u.id } }),
        this.prisma.userBadge.count({ where: { userId: u.id } }),
        this.prisma.activityLog.findMany({ where: { userId: u.id, createdAt: { gte: since90 } }, select: { createdAt: true } }),
        this.prisma.researchResponse.findMany({
          where: { code },
          include: { round: { include: { questions: { select: { id: true, scale: true } } } } },
        }),
      ]);
      const activeDays = new Set(activity.map((a) => day(a.createdAt))).size;
      const person: CsvCell[] = [
        code,
        day(c.consentedAt),
        c.consentVersion,
        u.generation ?? '',
        u.staffType ?? '',
        u.totalXp,
        accepted,
        completed,
        kudosSent,
        kudosReceived,
        badges,
        activeDays,
      ];

      if (linked.length === 0) rows.push([...person, '', '', '', '', '', '']);
      for (const r of linked.sort((a, b) => a.round.opensAt.getTime() - b.round.opensAt.getTime())) {
        const scaleById = new Map(r.round.questions.map((q) => [q.id, q.scale as SdtScale]));
        const [aut, com, rel] = averageByScale([r], scaleById).map((s) => s.score);
        rows.push([...person, r.round.id, r.round.titleEn, day(r.round.opensAt), aut, com, rel]);
      }
    }

    await logAudit(this.prisma, {
      actorId,
      action: 'research.exported',
      targetType: 'ResearchExport',
      metadata: { dataset: 'participants', participants: consents.length, rows: rows.length },
    });

    return {
      fileName: `research-track-participants-${day(new Date())}.csv`,
      csv: toCsv(
        [
          'research_code',
          'consented_on',
          'consent_version',
          'generation',
          'staff_type',
          'total_xp',
          'quests_accepted',
          'quests_completed',
          'kudos_sent',
          'kudos_received',
          'badges_earned',
          'active_days_last_90',
          'round_id',
          'round_title',
          'round_opens_on',
          'autonomy',
          'competence',
          'relatedness',
        ],
        rows,
      ),
    };
  }

  /**
   * Track A, anonymous: for every survey round, the overall SDT averages and the averages by
   * generation and by job role, with exactly the same k = 5 and suppression rules as the admin screens.
   */
  async exportAggregates(actorId: string): Promise<CsvExport> {
    const rounds = await this.prisma.surveyRound.findMany({ orderBy: { opensAt: 'asc' } });
    const rows: CsvCell[][] = [];

    for (const round of rounds) {
      const base = [round.id, round.titleEn, day(round.opensAt), day(round.closesAt)];
      const overall = await this.surveys.getScores(round.id);
      const [aut, com, rel] = overall.suppressed ? ['', '', ''] : overall.scores.map((s) => s.score);
      rows.push([...base, 'overall', 'all respondents', overall.respondentCount, overall.suppressed, aut, com, rel]);

      for (const dimension of ['generation', 'staffType'] as const) {
        const byGroup = await this.surveys.getScoresByGroup(dimension, round.id);
        if (byGroup.suppressed) continue; // the whole round is below the threshold; already flagged on the overall row
        for (const g of byGroup.groups) {
          const [ga, gc, gr] = g.scores.length ? g.scores.map((s) => s.score) : ['', '', ''];
          rows.push([...base, dimension === 'staffType' ? 'staff_type' : 'generation', g.key, g.respondents ?? '', g.suppressed, ga, gc, gr]);
        }
      }
    }

    await logAudit(this.prisma, {
      actorId,
      action: 'research.exported',
      targetType: 'ResearchExport',
      metadata: { dataset: 'aggregates', rounds: rounds.length, rows: rows.length },
    });

    return {
      fileName: `survey-aggregates-${day(new Date())}.csv`,
      csv: toCsv(
        ['round_id', 'round_title', 'opens_on', 'closes_on', 'breakdown', 'group', 'respondents', 'suppressed', 'autonomy', 'competence', 'relatedness'],
        rows,
      ),
    };
  }
}
