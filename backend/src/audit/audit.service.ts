import { Injectable } from '@nestjs/common';
import type { AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Bi } from '../common/dto/staff-member.dto';
import type { AuditEntryDto } from './dto/audit-entry.dto';

const UNKNOWN: Bi = { en: '—', ar: '—' };

/** Static, human-readable label per audit action code — mirrors the demo's fixed Bi action strings (e.g. makeAudit("Sent Kudos", ...) in DemoDataContext.tsx). */
function actionLabel(action: string, metadata: unknown): Bi {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  switch (action) {
    case 'quest.published':
      return { en: 'Published quest', ar: 'نشر مهمة' };
    case 'quest.draft_saved':
      return { en: 'Saved quest as draft', ar: 'حفظ مهمة كمسودة' };
    case 'quest.updated':
      return { en: 'Updated quest', ar: 'حدّث مهمة' };
    case 'quest.deleted':
      return { en: 'Deleted quest', ar: 'حذف مهمة' };
    case 'assignment.approved':
      return { en: 'Approved submission', ar: 'وافق على الإنجاز' };
    case 'assignment.rejected':
      return { en: 'Rejected submission', ar: 'رفض الإنجاز' };
    case 'department.created':
      return { en: 'Created department', ar: 'أنشأ قسمًا' };
    case 'department.updated':
      return { en: 'Updated department', ar: 'حدّث قسمًا' };
    case 'department.deleted':
      return { en: 'Deleted department', ar: 'حذف قسمًا' };
    case 'user.created':
      return { en: 'Created user', ar: 'أنشأ مستخدمًا' };
    case 'user.updated':
      return { en: 'Updated user', ar: 'حدّث مستخدمًا' };
    case 'user.deactivated':
      return { en: 'Deactivated user', ar: 'عطّل مستخدمًا' };
    case 'user.passwordReset':
      return { en: 'Reset password', ar: 'أعاد تعيين كلمة المرور' };
    case 'user.xpAwarded': {
      const amount = typeof meta.amount === 'number' ? meta.amount : 0;
      const sign = amount >= 0 ? '+' : '';
      return { en: `Awarded ${sign}${amount} XP`, ar: `منح ${sign}${amount} نقطة خبرة` };
    }
    case 'kudo.sent':
      return { en: 'Sent Kudos', ar: 'أرسل شكرًا' };
    case 'badge.awarded': {
      const badgeName = typeof meta.badgeName === 'string' ? meta.badgeName : '';
      return badgeName
        ? { en: `Awarded badge: ${badgeName}`, ar: `منح وسام: ${badgeName}` }
        : { en: 'Awarded badge', ar: 'منح وسامًا' };
    }
    default:
      return { en: action, ar: action };
  }
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(limit = 200): Promise<AuditEntryDto[]> {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    if (rows.length === 0) return [];

    const actorIds = Array.from(new Set(rows.map((r) => r.actorId)));
    const userTargetIds = Array.from(new Set(rows.filter((r) => r.targetType === 'User' && r.targetId).map((r) => r.targetId!)));
    const questTargetIds = Array.from(new Set(rows.filter((r) => r.targetType === 'Quest' && r.targetId).map((r) => r.targetId!)));
    const deptTargetIds = Array.from(new Set(rows.filter((r) => r.targetType === 'Department' && r.targetId).map((r) => r.targetId!)));
    const assignmentTargetIds = Array.from(
      new Set(rows.filter((r) => r.targetType === 'QuestAssignment' && r.targetId).map((r) => r.targetId!)),
    );

    const [actors, users, quests, departments, assignments] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: actorIds } } }),
      userTargetIds.length ? this.prisma.user.findMany({ where: { id: { in: userTargetIds } } }) : Promise.resolve([]),
      questTargetIds.length ? this.prisma.quest.findMany({ where: { id: { in: questTargetIds } } }) : Promise.resolve([]),
      deptTargetIds.length ? this.prisma.department.findMany({ where: { id: { in: deptTargetIds } } }) : Promise.resolve([]),
      assignmentTargetIds.length
        ? this.prisma.questAssignment.findMany({
            where: { id: { in: assignmentTargetIds } },
            include: { quest: true, employee: true },
          })
        : Promise.resolve([]),
    ]);

    const actorMap = new Map(actors.map((u) => [u.id, { en: u.nameEn, ar: u.nameAr }]));
    const userMap = new Map(users.map((u) => [u.id, { en: u.nameEn, ar: u.nameAr }]));
    const questMap = new Map(quests.map((q) => [q.id, { en: q.titleEn, ar: q.titleAr }]));
    const deptMap = new Map(departments.map((d) => [d.id, { en: d.nameEn, ar: d.nameAr }]));
    const assignmentMap = new Map(
      assignments.map((a) => [
        a.id,
        { en: `${a.quest.titleEn} · ${a.employee.nameEn}`, ar: `${a.quest.titleAr} · ${a.employee.nameAr}` },
      ]),
    );

    return rows.map((r) => ({
      id: r.id,
      at: r.createdAt,
      actor: actorMap.get(r.actorId) ?? UNKNOWN,
      action: actionLabel(r.action, r.metadata),
      target: this.resolveTarget(r, { userMap, questMap, deptMap, assignmentMap }),
    }));
  }

  private resolveTarget(
    row: AuditLog,
    maps: {
      userMap: Map<string, Bi>;
      questMap: Map<string, Bi>;
      deptMap: Map<string, Bi>;
      assignmentMap: Map<string, Bi>;
    },
  ): Bi {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const id = row.targetId ?? '';
    switch (row.targetType) {
      case 'User':
        return maps.userMap.get(id) ?? (typeof meta.email === 'string' ? { en: meta.email, ar: meta.email } : UNKNOWN);
      case 'Quest':
        return maps.questMap.get(id) ?? (typeof meta.titleEn === 'string' ? { en: meta.titleEn, ar: meta.titleEn } : UNKNOWN);
      case 'Department':
        return maps.deptMap.get(id) ?? (typeof meta.nameEn === 'string' ? { en: meta.nameEn, ar: meta.nameEn } : UNKNOWN);
      case 'QuestAssignment':
        return maps.assignmentMap.get(id) ?? UNKNOWN;
      default:
        return { en: row.targetType, ar: row.targetType };
    }
  }
}
