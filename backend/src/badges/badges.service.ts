import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Badge } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toBadgeDto } from '../common/utils/badge.mapper';
import { logAudit } from '../common/utils/audit.util';
import { computeBadgeProgress, progressPercent, type BadgeCriteria } from './badge-criteria';
import { MAX_FEATURED_BADGES } from './dto/set-featured-badges.dto';
import type { BadgeDto, MyBadgeDto } from '../common/dto/badge.dto';

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<BadgeDto[]> {
    const badges = await this.prisma.badge.findMany({ orderBy: { nameEn: 'asc' } });
    return badges.map(toBadgeDto);
  }

  /** The catalog resolved for one Employee: earned status + real progress toward each automatic requirement. */
  async findAllForEmployee(userId: string): Promise<MyBadgeDto[]> {
    await this.evaluate(userId);

    const [user, badges, earnedRows] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.badge.findMany({ orderBy: { nameEn: 'asc' } }),
      this.prisma.userBadge.findMany({ where: { userId } }),
    ]);
    const earnedAt = new Map(earnedRows.map((r) => [r.badgeId, r.awardedAt]));
    const featuredOrder = (id: string) => {
      const i = user.featuredBadgeIds.indexOf(id);
      return i >= 0 ? i : undefined;
    };

    return Promise.all(
      badges.map(async (b): Promise<MyBadgeDto> => {
        const dto = toBadgeDto(b);
        if (earnedAt.has(b.id)) {
          return { ...dto, earned: true, earnedOn: earnedAt.get(b.id), featuredOrder: featuredOrder(b.id) };
        }
        if (b.criteria === null) return { ...dto, earned: false };

        const progress = await computeBadgeProgress(this.prisma, user, b.criteria as unknown as BadgeCriteria);
        return {
          ...dto,
          earned: false,
          progressPct: progressPercent(progress),
          progressCurrent: progress.current,
          progressTarget: progress.target,
        };
      }),
    );
  }

  /** Replaces the Employee's leaderboard showcase. Only badges they've actually earned can be featured. */
  async setFeatured(userId: string, badgeIds: string[]): Promise<string[]> {
    if (badgeIds.length > MAX_FEATURED_BADGES) {
      throw new BadRequestException(`You can feature up to ${MAX_FEATURED_BADGES} badges.`);
    }
    const earned = await this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } });
    const earnedIds = new Set(earned.map((e) => e.badgeId));
    if (!badgeIds.every((id) => earnedIds.has(id))) {
      throw new BadRequestException('You can only feature badges you have earned.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { featuredBadgeIds: badgeIds } });
    return badgeIds;
  }

  /**
   * Checks every automatic badge this Employee hasn't earned yet and grants
   * the ones whose requirement is now met. Called after each event that can
   * move a requirement (quest accepted/approved, Kudos, XP, survey) and when
   * the gallery loads. Never throws — a badge-check failure must not break the
   * action that triggered it.
   */
  async evaluate(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'employee' || !user.isActive) return;

      const [badges, earnedRows] = await Promise.all([
        this.prisma.badge.findMany(),
        this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
      ]);
      const earned = new Set(earnedRows.map((r) => r.badgeId));

      for (const badge of badges) {
        if (earned.has(badge.id) || badge.criteria === null) continue;
        const progress = await computeBadgeProgress(this.prisma, user, badge.criteria as unknown as BadgeCriteria);
        if (progress.current >= progress.target) await this.grant(userId, badge, null);
      }
    } catch (err) {
      this.logger.error(`Badge evaluation failed for user ${userId}`, err instanceof Error ? err.stack : String(err));
    }
  }

  /** Administrator grant — only for badges with no automatic rule. Everything else has to be earned. */
  async award(userId: string, badgeId: string, actorId: string): Promise<void> {
    const [user, badge] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.badge.findUnique({ where: { id: badgeId } }),
    ]);
    if (!user) throw new NotFoundException('User not found.');
    if (!badge) throw new NotFoundException('Badge not found.');
    if (badge.criteria !== null) {
      throw new BadRequestException(
        'This badge is earned automatically by meeting its requirements — it cannot be awarded manually.',
      );
    }

    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });
    if (existing) throw new BadRequestException('This user already has that badge.');

    await this.grant(userId, badge, actorId);

    await logAudit(this.prisma, {
      actorId,
      action: 'badge.awarded',
      targetType: 'User',
      targetId: userId,
      metadata: { badgeId, badgeName: badge.nameEn },
    });
  }

  private async grant(userId: string, badge: Badge, awardedById: string | null): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.userBadge.create({ data: { userId, badgeId: badge.id, awardedById } }),
        this.prisma.activityLog.create({
          data: {
            userId,
            kind: 'badge',
            textEn: `Earned badge: ${badge.nameEn}`,
            textAr: `حصل على وسام: ${badge.nameAr}`,
            refType: 'Badge',
            refId: badge.id,
          },
        }),
        this.prisma.notification.create({
          data: {
            userId,
            kind: 'badge',
            titleEn: 'New badge earned',
            titleAr: 'وسام جديد',
            bodyEn: `You earned the "${badge.nameEn}" badge.`,
            bodyAr: `حصلت على وسام "${badge.nameAr}".`,
          },
        }),
      ]);
    } catch (err) {
      // Two events can evaluate the same user at once — the unique (userId, badgeId) constraint makes the loser a no-op.
      if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') return;
      throw err;
    }
  }
}
