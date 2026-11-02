import { Injectable } from '@nestjs/common';
import type { Department, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Bi } from '../common/dto/staff-member.dto';
import type {
  AnalyticsOverviewDto,
  BadgeDistributionDto,
  DemographicsDto,
  ParticipationPointDto,
  XpByDepartmentDto,
} from './dto/analytics.dto';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const MONTH_LABELS: Bi[] = [
  { en: 'Jan', ar: 'يناير' },
  { en: 'Feb', ar: 'فبراير' },
  { en: 'Mar', ar: 'مارس' },
  { en: 'Apr', ar: 'أبريل' },
  { en: 'May', ar: 'مايو' },
  { en: 'Jun', ar: 'يونيو' },
  { en: 'Jul', ar: 'يوليو' },
  { en: 'Aug', ar: 'أغسطس' },
  { en: 'Sep', ar: 'سبتمبر' },
  { en: 'Oct', ar: 'أكتوبر' },
  { en: 'Nov', ar: 'نوفمبر' },
  { en: 'Dec', ar: 'ديسمبر' },
];

const TIER_LABEL: Record<string, Bi> = {
  bronze: { en: 'Bronze', ar: 'برونزي' },
  silver: { en: 'Silver', ar: 'فضي' },
  gold: { en: 'Gold', ar: 'ذهبي' },
};

/**
 * Only Employees earn XP / show up as "participants" — same scoping the
 * leaderboard already uses (Managers/Admins are excluded from these KPIs).
 */
@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(): Promise<AnalyticsOverviewDto> {
    const employees = await this.prisma.user.findMany({
      where: { role: 'employee', isActive: true },
      include: { department: true },
    });
    const totalEligible = employees.length;
    const employeeIds = employees.map((e) => e.id);

    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

    const [activeRows, kudos30d, questsCompleted30d, participationTrend, badgeDistribution] = await Promise.all([
      employeeIds.length
        ? this.prisma.activityLog.findMany({
            where: { userId: { in: employeeIds }, createdAt: { gte: thirtyDaysAgo } },
            select: { userId: true },
            distinct: ['userId'],
          })
        : Promise.resolve([]),
      this.prisma.kudo.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.questAssignment.count({ where: { status: 'completed', approvedAt: { gte: thirtyDaysAgo } } }),
      this.getParticipationTrend(employeeIds, totalEligible),
      this.getBadgeDistribution(),
    ]);

    const activeParticipants = activeRows.length;
    const participationRate = totalEligible > 0 ? Math.round((activeParticipants / totalEligible) * 100) : 0;

    return {
      kpis: { activeParticipants, totalEligible, participationRate, kudos30d, questsCompleted30d },
      participationTrend,
      xpByDepartment: this.computeXpByDepartment(employees),
      badgeDistribution,
    };
  }

  async getDemographics(): Promise<DemographicsDto> {
    const [male, female] = await Promise.all([
      this.prisma.user.count({ where: { role: 'employee', isActive: true, gender: 'male' } }),
      this.prisma.user.count({ where: { role: 'employee', isActive: true, gender: 'female' } }),
    ]);
    return {
      byGender: [
        { key: { en: 'Male', ar: 'ذكر' }, value: male },
        { key: { en: 'Female', ar: 'أنثى' }, value: female },
      ],
    };
  }

  /** Lifetime totalXp average per department — a headline KPI, not period-scoped. */
  private computeXpByDepartment(employees: (User & { department: Department | null })[]): XpByDepartmentDto[] {
    const byDept = new Map<string, { nameEn: string; nameAr: string; total: number; count: number }>();
    for (const e of employees) {
      if (!e.department) continue;
      const agg = byDept.get(e.department.id) ?? {
        nameEn: e.department.nameEn,
        nameAr: e.department.nameAr,
        total: 0,
        count: 0,
      };
      agg.total += e.totalXp;
      agg.count += 1;
      byDept.set(e.department.id, agg);
    }
    return Array.from(byDept.values())
      .map((d) => ({ department: { en: d.nameEn, ar: d.nameAr }, avgXp: Math.round(d.total / d.count) }))
      .sort((a, b) => b.avgXp - a.avgXp);
  }

  private async getBadgeDistribution(): Promise<BadgeDistributionDto[]> {
    const rows = await this.prisma.userBadge.findMany({ include: { badge: { select: { tier: true } } } });
    const counts: Record<string, number> = { bronze: 0, silver: 0, gold: 0 };
    for (const r of rows) counts[r.badge.tier] = (counts[r.badge.tier] ?? 0) + 1;
    return (['bronze', 'silver', 'gold'] as const).map((tier) => ({ tier: TIER_LABEL[tier], count: counts[tier] }));
  }

  /**
   * Last 8 calendar months. The denominator (totalEligible) is today's
   * active-Employee count for every month — there's no historical headcount
   * snapshot to divide by instead, so older months are a slight
   * approximation, same honest trade-off as elsewhere in this backend.
   */
  private async getParticipationTrend(employeeIds: string[], totalEligible: number): Promise<ParticipationPointDto[]> {
    const now = new Date();
    const months = Array.from({ length: 8 }, (_, idx) => {
      const i = 7 - idx;
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      return { start, end, label: MONTH_LABELS[start.getMonth()] };
    });

    const results = await Promise.all(
      months.map((m) =>
        employeeIds.length
          ? this.prisma.activityLog.findMany({
              where: { userId: { in: employeeIds }, createdAt: { gte: m.start, lt: m.end } },
              select: { userId: true },
              distinct: ['userId'],
            })
          : Promise.resolve([]),
      ),
    );

    return months.map((m, i) => ({
      month: m.label,
      rate: totalEligible > 0 ? Math.round((results[i].length / totalEligible) * 100) : 0,
    }));
  }
}
