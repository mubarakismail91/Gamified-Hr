import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SquadChallenge } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { XpLedgerService } from '../ledger/xp-ledger.service';
import { logAudit } from '../common/utils/audit.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MIN_RANKED_MEMBERS } from './squad-rules';
import type { ChallengeDto, CreateChallengeDto } from './dto/squad.dto';

const CHALLENGE_REF = 'SquadChallenge';

function statusOf(c: Pick<SquadChallenge, 'startsAt' | 'endsAt'>, now = new Date()): ChallengeDto['status'] {
  if (now < c.startsAt) return 'upcoming';
  if (now > c.endsAt) return 'ended';
  return 'active';
}

/**
 * Cross-department squad challenges (FR9). A manager or admin publishes a shared target; any
 * ranked squad (3+ active members) can join. Progress is the squad's COMBINED activity inside
 * the challenge window, counting whoever is an active member now. The first time it reaches the
 * target, every active member gets the bonus XP, exactly once.
 */
@Injectable()
export class SquadChallengesService {
  private readonly logger = new Logger(SquadChallengesService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: XpLedgerService,
  ) {}

  async create(viewer: AuthenticatedUser, dto: CreateChallengeDto): Promise<ChallengeDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('The end date must be after the start date.');
    if (endsAt <= new Date()) throw new BadRequestException('The end date must be in the future.');

    const c = await this.prisma.squadChallenge.create({
      data: {
        titleEn: dto.titleEn.trim(),
        titleAr: dto.titleAr?.trim() || dto.titleEn.trim(),
        descriptionEn: dto.descriptionEn?.trim() ?? '',
        descriptionAr: dto.descriptionAr?.trim() || dto.descriptionEn?.trim() || '',
        metric: dto.metric,
        target: dto.target,
        bonusXp: dto.bonusXp,
        startsAt,
        endsAt,
        createdById: viewer.id,
      },
    });
    await logAudit(this.prisma, {
      actorId: viewer.id,
      action: 'challenge.created',
      targetType: 'SquadChallenge',
      targetId: c.id,
      metadata: { title: c.titleEn, target: c.target, bonusXp: c.bonusXp },
    });
    return (await this.list(viewer)).find((x) => x.id === c.id)!;
  }

  async list(viewer: AuthenticatedUser): Promise<ChallengeDto[]> {
    const mySquad =
      viewer.role === 'employee'
        ? await this.prisma.squadMember.findFirst({ where: { userId: viewer.id, status: 'active' } })
        : null;
    if (mySquad) await this.evaluateSquad(mySquad.squadId); // lazy check, in case a target was met by time passing

    const challenges = await this.prisma.squadChallenge.findMany({
      include: { entries: true },
      orderBy: [{ endsAt: 'desc' }],
    });
    return Promise.all(
      challenges.map(async (c) => {
        const entry = mySquad ? c.entries.find((e) => e.squadId === mySquad.squadId) : undefined;
        return {
          id: c.id,
          title: { en: c.titleEn, ar: c.titleAr },
          description: { en: c.descriptionEn, ar: c.descriptionAr },
          metric: c.metric,
          target: c.target,
          bonusXp: c.bonusXp,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          status: statusOf(c),
          squadsJoined: c.entries.length,
          squadsCompleted: c.entries.filter((e) => e.completedAt).length,
          mine: mySquad
            ? {
                joined: !!entry,
                progress: entry ? await this.progress(mySquad.squadId, c) : 0,
                completedAt: entry?.completedAt ?? null,
              }
            : null,
        };
      }),
    );
  }

  /** Any active member can sign their squad up, if the squad is ranked and the challenge hasn't ended. */
  async join(viewer: AuthenticatedUser, challengeId: string): Promise<ChallengeDto> {
    const challenge = await this.prisma.squadChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found.');
    if (statusOf(challenge) === 'ended') throw new BadRequestException('This challenge has ended.');

    const membership = await this.prisma.squadMember.findFirst({ where: { userId: viewer.id, status: 'active' } });
    if (!membership) throw new BadRequestException('Join or create a squad first.');
    const active = await this.prisma.squadMember.count({ where: { squadId: membership.squadId, status: 'active' } });
    if (active < MIN_RANKED_MEMBERS) {
      throw new BadRequestException(`Your squad needs at least ${MIN_RANKED_MEMBERS} members to take on a challenge.`);
    }

    await this.prisma.squadChallengeEntry.upsert({
      where: { squadId_challengeId: { squadId: membership.squadId, challengeId } },
      create: { squadId: membership.squadId, challengeId },
      update: {},
    });
    await this.evaluateSquad(membership.squadId);
    return (await this.list(viewer)).find((c) => c.id === challengeId)!;
  }

  /** Called after events that can move progress (quest approved, XP awarded). Never throws. */
  async evaluateForUser(userId: string): Promise<void> {
    try {
      const membership = await this.prisma.squadMember.findFirst({ where: { userId, status: 'active' } });
      if (membership) await this.evaluateSquad(membership.squadId);
    } catch (err) {
      this.logger.error(`Challenge evaluation failed for ${userId}`, err instanceof Error ? err.stack : String(err));
    }
  }

  /** Combined progress of the squad's current active members inside the challenge window. */
  async progress(squadId: string, c: SquadChallenge): Promise<number> {
    const members = await this.prisma.squadMember.findMany({ where: { squadId, status: 'active' }, select: { userId: true } });
    const ids = members.map((m) => m.userId);
    if (ids.length === 0) return 0;
    const window = { gte: c.startsAt, lte: c.endsAt };

    if (c.metric === 'quests_completed') {
      return this.prisma.questAssignment.count({ where: { employeeId: { in: ids }, status: 'completed', approvedAt: window } });
    }
    const sum = await this.prisma.activityLog.aggregate({
      _sum: { xpDelta: true },
      // Challenge bonuses don't count as progress. Most XP rows have refType NULL, and in SQL
      // `NOT (refType = 'X')` is not true for NULL, so NULL has to be allowed explicitly.
      where: { userId: { in: ids }, createdAt: window, OR: [{ refType: null }, { refType: { not: CHALLENGE_REF } }] },
    });
    return sum._sum.xpDelta ?? 0;
  }

  private async evaluateSquad(squadId: string): Promise<void> {
    const open = await this.prisma.squadChallengeEntry.findMany({
      where: { squadId, completedAt: null },
      include: { challenge: true },
    });
    for (const entry of open) {
      if (new Date() < entry.challenge.startsAt) continue;
      if ((await this.progress(squadId, entry.challenge)) >= entry.challenge.target) {
        await this.award(entry.id, squadId, entry.challenge);
      }
    }
  }

  /** Marks the entry complete and pays every active member, in one transaction, at most once. */
  private async award(entryId: string, squadId: string, c: SquadChallenge): Promise<void> {
    const paid = await this.prisma.$transaction(async (tx) => {
      // Claim first: only the request that flips completedAt from null gets to pay out.
      const claimed = await tx.squadChallengeEntry.updateMany({
        where: { id: entryId, completedAt: null },
        data: { completedAt: new Date() },
      });
      if (claimed.count === 0) return [];

      const members = await tx.squadMember.findMany({ where: { squadId, status: 'active' }, select: { userId: true } });
      for (const { userId } of members) {
        await this.ledger.record(tx, {
          userId,
          amount: c.bonusXp,
          source: 'challenge_bonus',
          refType: CHALLENGE_REF,
          refId: c.id,
          idempotencyKey: `challenge:${entryId}:${userId}`,
        });
        await tx.activityLog.create({
          data: {
            userId,
            kind: 'xp',
            textEn: `Squad challenge completed: ${c.titleEn}`,
            textAr: `أنجز الفريق التحدي: ${c.titleAr}`,
            xpDelta: c.bonusXp,
            refType: CHALLENGE_REF,
            refId: c.id,
          },
        });
        await tx.notification.create({
          data: {
            userId,
            kind: 'xp',
            titleEn: `+${c.bonusXp} XP: squad challenge completed`,
            titleAr: `+${c.bonusXp} نقطة: أنجز فريقك التحدي`,
            bodyEn: `Your squad reached the target of "${c.titleEn}".`,
            bodyAr: `بلغ فريقك هدف "${c.titleAr}".`,
          },
        });
      }
      return members.map((m) => m.userId);
    });

    if (paid.length) {
      await logAudit(this.prisma, {
        actorId: c.createdById,
        action: 'challenge.completed',
        targetType: 'Squad',
        targetId: squadId,
        metadata: { challenge: c.titleEn, bonusXp: c.bonusXp, members: paid.length },
      });
    }
  }
}
