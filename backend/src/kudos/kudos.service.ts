import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { toStaffMemberDto } from '../common/utils/staff-member.mapper';
import { ZERO_PERIOD_STATS } from '../common/utils/xp-period.util';
import { logAudit } from '../common/utils/audit.util';
import { SendKudoDto } from './dto/send-kudo.dto';
import type { KudoDto } from './dto/kudo.dto';

/** Mirrors the demo's sendKudos bonus (src/store/DemoDataContext.tsx). */
const KUDO_XP_BONUS = 15;

@Injectable()
export class KudosService {
  constructor(
    private prisma: PrismaService,
    private badges: BadgesService,
  ) {}

  /** Platform-wide feed, most recent first — same as the demo's Kudos page. */
  async findAll(): Promise<KudoDto[]> {
    const kudos = await this.prisma.kudo.findMany({ orderBy: { createdAt: 'desc' } });
    if (kudos.length === 0) return [];

    const userIds = Array.from(new Set(kudos.flatMap((k) => [k.fromUserId, k.toUserId])));
    const [users, badgeRows] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: userIds } }, include: { department: true } }),
      this.prisma.userBadge.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, badgeId: true },
      }),
    ]);

    const badgesByUser = new Map<string, string[]>();
    for (const row of badgeRows) {
      const list = badgesByUser.get(row.userId) ?? [];
      list.push(row.badgeId);
      badgesByUser.set(row.userId, list);
    }
    const staffMap = new Map(
      users.map((u) => [u.id, toStaffMemberDto(u, u.department, ZERO_PERIOD_STATS, badgesByUser.get(u.id) ?? [])]),
    );

    return kudos
      .filter((k) => staffMap.has(k.fromUserId) && staffMap.has(k.toUserId))
      .map((k) => ({
        id: k.id,
        fromId: k.fromUserId,
        toId: k.toUserId,
        value: k.value,
        message: { en: k.messageEn, ar: k.messageAr },
        at: k.createdAt,
        fromStaff: staffMap.get(k.fromUserId)!,
        toStaff: staffMap.get(k.toUserId)!,
      }));
  }

  /** Sends Kudos and awards the recipient a fixed XP bonus, same as the demo. */
  async send(dto: SendKudoDto, fromUserId: string): Promise<void> {
    if (dto.toUserId === fromUserId) throw new BadRequestException('You cannot send Kudos to yourself.');

    const [from, to] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: fromUserId } }),
      this.prisma.user.findUnique({ where: { id: dto.toUserId } }),
    ]);
    if (!from) throw new NotFoundException('Sender not found.');
    if (!to || !to.isActive) throw new NotFoundException('Recipient not found.');

    // The frontend collects one freeform message, not separate translations —
    // it duplicates the same text into en/ar (see src/pages/Kudos.tsx), so we do too.
    const message = dto.message.trim();

    const kudo = await this.prisma.kudo.create({
      data: { fromUserId, toUserId: dto.toUserId, value: dto.value, messageEn: message, messageAr: message },
    });

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: dto.toUserId }, data: { totalXp: { increment: KUDO_XP_BONUS } } }),
      this.prisma.activityLog.create({
        data: {
          userId: dto.toUserId,
          kind: 'kudo',
          textEn: `Received Kudos from ${from.nameEn}`,
          textAr: `استلم شكرًا من ${from.nameAr}`,
          xpDelta: KUDO_XP_BONUS,
          refType: 'Kudo',
          refId: kudo.id,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: dto.toUserId,
          kind: 'social',
          titleEn: `New Kudos from ${from.nameEn}`,
          titleAr: `شكر جديد من ${from.nameAr}`,
          bodyEn: message,
          bodyAr: message,
        },
      }),
    ]);

    await logAudit(this.prisma, {
      actorId: fromUserId,
      action: 'kudo.sent',
      targetType: 'User',
      targetId: dto.toUserId,
      metadata: { value: dto.value, kudoId: kudo.id },
    });

    await this.badges.evaluate(dto.toUserId);
  }
}
