import { PrismaService } from '../../prisma/prisma.service';
import { toStaffMemberDto } from './staff-member.mapper';
import { getPeriodXpStats, ZERO_PERIOD_STATS } from './xp-period.util';
import type { StaffMemberDto } from '../dto/staff-member.dto';

/**
 * Shared by /auth/me and /users so there's one place that composes a full
 * StaffMemberDto. `includePeriodStats` defaults to true for a single-user
 * fetch; the /users list view passes false, since nothing in that table
 * renders "points this week" and computing it per row would be an N+1
 * aggregate query for no visible benefit.
 */
export async function buildStaffMemberDto(
  prisma: PrismaService,
  userId: string,
  opts: { includePeriodStats?: boolean } = {},
): Promise<StaffMemberDto> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { department: true } });
  const [periodStats, badges] = await Promise.all([
    opts.includePeriodStats === false ? Promise.resolve(ZERO_PERIOD_STATS) : getPeriodXpStats(prisma, userId),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ]);
  return toStaffMemberDto(
    user,
    user.department,
    periodStats,
    badges.map((b) => b.badgeId),
  );
}
