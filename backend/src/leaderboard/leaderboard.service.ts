import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toStaffMemberDto } from '../common/utils/staff-member.mapper';
import { getPeriodXpStatsBatch, ZERO_PERIOD_STATS } from '../common/utils/xp-period.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type {
  LeaderboardEntryDto,
  MostImprovedDto,
  TopDepartmentDto,
  TopPerformerDto,
} from './dto/leaderboard-entry.dto';

export type Period = 'week' | 'month';
export type Scope = 'dept' | 'uni';
export type Metric = 'points' | 'progress';

/** Mirrors the frontend's ALL_DEPARTMENTS sentinel (src/pages/Leaderboard.tsx) — sent over the wire as-is. */
const ALL_DEPARTMENTS = '__all__';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Only Employees earn XP via quests, so only Employees are ever ranked —
   * Managers/Admins are excluded here, same as the demo's rankedLeaderboard.
   * `departmentId`: undefined = derive from `scope`, "__all__" = university-wide, otherwise one department.
   */
  async ranked(
    viewer: AuthenticatedUser,
    opts: { period: Period; metric: Metric; scope: Scope; departmentId?: string },
  ): Promise<LeaderboardEntryDto[]> {
    let departmentFilter: string | null;
    if (opts.departmentId !== undefined) {
      departmentFilter = opts.departmentId === ALL_DEPARTMENTS ? null : opts.departmentId;
    } else if (opts.scope === 'dept') {
      if (viewer.role === 'manager') {
        // A Manager's own departmentId isn't guaranteed to match the department
        // they manage (see UsersService.findAllForViewer) — the managerId
        // relationship is the source of truth, not the denormalised field.
        const dept = await this.prisma.department.findFirst({ where: { managerId: viewer.id } });
        departmentFilter = dept?.id ?? null;
      } else {
        const me = await this.prisma.user.findUniqueOrThrow({ where: { id: viewer.id } });
        departmentFilter = me.departmentId;
      }
    } else {
      departmentFilter = null;
    }

    const users = await this.prisma.user.findMany({
      where: { role: 'employee', isActive: true, ...(departmentFilter ? { departmentId: departmentFilter } : {}) },
      include: { department: true },
    });
    if (users.length === 0) return [];

    const [periodStats, badgeRows] = await Promise.all([
      getPeriodXpStatsBatch(this.prisma, users.map((u) => u.id)),
      this.prisma.userBadge.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
        select: { userId: true, badgeId: true },
      }),
    ]);

    const badgesByUser = new Map<string, string[]>();
    for (const row of badgeRows) {
      const list = badgesByUser.get(row.userId) ?? [];
      list.push(row.badgeId);
      badgesByUser.set(row.userId, list);
    }

    const rows = users.map((u) => {
      const stats = periodStats.get(u.id) ?? ZERO_PERIOD_STATS;
      const points = opts.period === 'week' ? stats.pointsThisWeek : stats.pointsThisMonth;
      return {
        staffId: u.id,
        points,
        // No arbitrary demo multiplier here — "progress" is an honest alias of points, not fabricated data.
        progress: points,
        deltaRank: 0,
        staff: toStaffMemberDto(u, u.department, stats, badgesByUser.get(u.id) ?? []),
      };
    });

    rows.sort((a, b) => (opts.metric === 'points' ? b.points - a.points : b.progress - a.progress));

    return rows.map((r, i) => ({ ...r, position: i + 1 }));
  }

  /** Manager: always their own managed department. Admin: the requested department. */
  async topPerformer(
    viewer: AuthenticatedUser,
    opts: { period: Period; departmentId?: string },
  ): Promise<TopPerformerDto | null> {
    let departmentId: string;
    if (viewer.role === 'manager') {
      const dept = await this.prisma.department.findFirst({ where: { managerId: viewer.id } });
      if (!dept) throw new ForbiddenException("You don't manage a department.");
      departmentId = dept.id;
    } else {
      if (!opts.departmentId) throw new BadRequestException('departmentId is required.');
      departmentId = opts.departmentId;
    }

    const users = await this.prisma.user.findMany({
      where: { role: 'employee', isActive: true, departmentId },
      include: { department: true },
    });
    if (users.length === 0) return null;

    const stats = await getPeriodXpStatsBatch(this.prisma, users.map((u) => u.id));
    const ranked = users
      .map((u) => ({
        user: u,
        points: opts.period === 'week' ? (stats.get(u.id)?.pointsThisWeek ?? 0) : (stats.get(u.id)?.pointsThisMonth ?? 0),
      }))
      .sort((a, b) => b.points - a.points);

    const top = ranked[0];
    const badges = await this.prisma.userBadge.findMany({
      where: { userId: top.user.id },
      select: { badgeId: true },
    });

    return {
      points: top.points,
      staff: toStaffMemberDto(
        top.user,
        top.user.department,
        stats.get(top.user.id) ?? ZERO_PERIOD_STATS,
        badges.map((b) => b.badgeId),
      ),
    };
  }

  async topDepartments(period: Period, limit: number): Promise<TopDepartmentDto[]> {
    const [departments, employees] = await Promise.all([
      this.prisma.department.findMany(),
      this.prisma.user.findMany({ where: { role: 'employee', isActive: true } }),
    ]);
    const stats = await getPeriodXpStatsBatch(this.prisma, employees.map((e) => e.id));

    const byDept = new Map<string, { total: number; count: number }>();
    for (const e of employees) {
      if (!e.departmentId) continue;
      const points =
        period === 'week' ? (stats.get(e.id)?.pointsThisWeek ?? 0) : (stats.get(e.id)?.pointsThisMonth ?? 0);
      const agg = byDept.get(e.departmentId) ?? { total: 0, count: 0 };
      agg.total += points;
      agg.count += 1;
      byDept.set(e.departmentId, agg);
    }

    return departments
      .map((d) => {
        const agg = byDept.get(d.id);
        return {
          departmentId: d.id,
          department: { en: d.nameEn, ar: d.nameAr },
          avgPoints: agg ? Math.round(agg.total / agg.count) : 0,
          employeeCount: agg?.count ?? 0,
        };
      })
      .filter((r) => r.employeeCount > 0)
      .sort((a, b) => b.avgPoints - a.avgPoints)
      .slice(0, limit);
  }

  /** `departmentId` undefined or "__all__" = university-wide. */
  async mostImproved(period: Period, departmentId?: string): Promise<MostImprovedDto | null> {
    const deptFilter = departmentId && departmentId !== ALL_DEPARTMENTS ? departmentId : undefined;
    const users = await this.prisma.user.findMany({
      where: { role: 'employee', isActive: true, ...(deptFilter ? { departmentId: deptFilter } : {}) },
      include: { department: true },
    });
    if (users.length === 0) return null;

    const stats = await getPeriodXpStatsBatch(this.prisma, users.map((u) => u.id));
    const ranked = users
      .map((u) => ({
        user: u,
        progress:
          period === 'week' ? (stats.get(u.id)?.pointsThisWeek ?? 0) : (stats.get(u.id)?.pointsThisMonth ?? 0),
      }))
      .sort((a, b) => b.progress - a.progress);

    const top = ranked[0];
    const badges = await this.prisma.userBadge.findMany({
      where: { userId: top.user.id },
      select: { badgeId: true },
    });

    return {
      progress: top.progress,
      staff: toStaffMemberDto(
        top.user,
        top.user.department,
        stats.get(top.user.id) ?? ZERO_PERIOD_STATS,
        badges.map((b) => b.badgeId),
      ),
    };
  }
}
