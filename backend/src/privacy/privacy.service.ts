import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { logAudit } from '../common/utils/audit.util';
import { getResearchKey, researchCode, CONSENT_VERSION } from '../research/research-code';
import { retentionPolicy } from './retention-config';
import { deleteStoredFiles } from '../files/file-store';

const DAY_MS = 24 * 60 * 60 * 1000;
const ERASED_NAME = { en: 'Former staff member', ar: 'موظف سابق' };

export interface RetentionRunResult {
  sessionsDeleted: number;
  notificationsDeleted: number;
  accountsAnonymised: number;
}

/**
 * PDPL data-subject rights and retention:
 *  - access: exportMyData() returns everything held about the signed-in person;
 *  - destruction: erase() anonymises a deactivated person (admin only);
 *  - retention: runRetention() (daily, and on demand) applies the periods in retention-config.ts.
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  policy() {
    return { ...retentionPolicy(), researchConsentVersion: CONSENT_VERSION };
  }

  // ------------------------------------------------------------- right of access

  async exportMyData(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { department: { select: { nameEn: true, nameAr: true } } },
    });
    const [activity, assignments, submissions, kudosSent, kudosReceived, badges, notifications, squads, research, surveys, sessions, actions] =
      await Promise.all([
        this.prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.questAssignment.findMany({ where: { employeeId: userId }, include: { quest: { select: { titleEn: true, titleAr: true } } } }),
        this.prisma.questSubmission.findMany({
          where: { employeeId: userId },
          select: { id: true, assignmentId: true, fileName: true, fileType: true, fileSize: true, notes: true, status: true, submittedAt: true, reviewedAt: true, feedback: true },
        }),
        this.prisma.kudo.findMany({ where: { fromUserId: userId }, include: { toUser: { select: { nameEn: true } } } }),
        this.prisma.kudo.findMany({ where: { toUserId: userId }, include: { fromUser: { select: { nameEn: true } } } }),
        this.prisma.userBadge.findMany({ where: { userId }, include: { badge: { select: { nameEn: true, nameAr: true } } } }),
        this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.squadMember.findMany({ where: { userId }, include: { squad: { select: { name: true } } } }),
        this.prisma.researchConsent.findUnique({ where: { userId } }),
        this.prisma.surveyParticipation.findMany({ where: { userId }, include: { round: { select: { titleEn: true } } } }),
        this.prisma.refreshToken.findMany({ where: { userId }, select: { createdAt: true, expiresAt: true, revokedAt: true } }),
        this.prisma.auditLog.findMany({ where: { actorId: userId }, select: { action: true, targetType: true, createdAt: true } }),
      ]);
    const ledger = await this.prisma.xpTransaction.findMany({ where: { userId }, orderBy: { seq: 'asc' } });

    await logAudit(this.prisma, { actorId: userId, action: 'privacy.dataExported', targetType: 'User', targetId: userId });

    return {
      exportedAt: new Date(),
      about:
        'Everything the IU Gamified HR platform holds about you. Pulse-survey answers are anonymous and stored without your identity, so they cannot be included; only the fact that you took part is listed.',
      profile: {
        id: user.id,
        staffId: user.staffId,
        name: { en: user.nameEn, ar: user.nameAr },
        email: user.email,
        title: { en: user.titleEn, ar: user.titleAr },
        role: user.role,
        gender: user.gender,
        generation: user.generation,
        staffType: user.staffType,
        department: user.department ? { en: user.department.nameEn, ar: user.department.nameAr } : null,
        office: { en: user.officeEn, ar: user.officeAr },
        college: { en: user.collegeEn, ar: user.collegeAr },
        totalXp: user.totalXp,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      xpAndActivity: activity.map((a) => ({ at: a.createdAt, kind: a.kind, text: a.textEn, xp: a.xpDelta })),
      xpLedger: ledger.map((t) => ({ at: t.createdAt, amount: t.amount, balanceAfter: t.balanceAfter, source: t.source, hash: t.hash })),
      quests: assignments.map((a) => ({
        quest: a.quest.titleEn,
        status: a.status,
        stepsDone: a.stepsDone,
        acceptedAt: a.acceptedAt,
        submittedAt: a.submittedAt,
        approvedAt: a.approvedAt,
        rejectionNote: a.rejectionNote,
      })),
      submissions,
      kudosSent: kudosSent.map((k) => ({ at: k.createdAt, to: k.toUser.nameEn, value: k.value, message: k.messageEn })),
      kudosReceived: kudosReceived.map((k) => ({ at: k.createdAt, from: k.fromUser.nameEn, value: k.value, message: k.messageEn })),
      badges: badges.map((b) => ({ badge: b.badge.nameEn, awardedAt: b.awardedAt })),
      notifications: notifications.map((n) => ({ at: n.createdAt, title: n.titleEn, body: n.bodyEn, read: n.isRead })),
      squads: squads.map((m) => ({ squad: m.squad.name, status: m.status, joinedAt: m.joinedAt })),
      researchStudy: research ? { consented: true, consentedAt: research.consentedAt, consentVersion: research.consentVersion } : { consented: false },
      surveyParticipation: surveys.map((p) => ({ round: p.round.titleEn, completedAt: p.completedAt })),
      loginSessions: sessions,
      actionsYouTook: actions,
    };
  }

  // ------------------------------------------------------- right to destruction

  async listDeactivated() {
    const users = await this.prisma.user.findMany({
      where: { isActive: false },
      orderBy: { deactivatedAt: 'desc' },
      select: { id: true, nameEn: true, nameAr: true, email: true, role: true, deactivatedAt: true, erasedAt: true },
    });
    return users.map((u) => ({
      id: u.id,
      name: { en: u.nameEn, ar: u.nameAr },
      email: u.erasedAt ? null : u.email,
      role: u.role,
      deactivatedAt: u.deactivatedAt,
      erasedAt: u.erasedAt,
    }));
  }

  /**
   * Anonymises a DEACTIVATED person. Personal data (name, email, demographics, free-text they wrote
   * or that was written about them, uploaded files, sessions, notifications, squad and research
   * records) is removed or replaced. The row itself stays, so XP totals, anonymous survey counts
   * and the audit trail remain consistent; it now reads "Former staff member".
   * Gender and department are kept: they only feed group counts (shown for groups of 5 or more).
   */
  async erase(userId: string, actorId: string | null): Promise<{ erased: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.isActive) throw new BadRequestException('Deactivate the account before erasing it.');
    if (user.erasedAt) throw new BadRequestException('This account has already been erased.');
    if (actorId === userId) throw new BadRequestException("You can't erase your own account.");

    const key = getResearchKey(this.config);
    const unusableHash = await bcrypt.hash(randomBytes(32).toString('hex'), 4);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          nameEn: ERASED_NAME.en,
          nameAr: ERASED_NAME.ar,
          initials: '—',
          email: `erased-${userId}@erased.invalid`,
          titleEn: '',
          titleAr: '',
          officeEn: '',
          officeAr: '',
          collegeEn: '',
          collegeAr: '',
          generation: null,
          staffType: null,
          featuredBadgeIds: [],
          passwordHash: unusableHash,
          erasedAt: new Date(),
        },
      });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.squadMember.deleteMany({ where: { userId } });
      await tx.surveyParticipation.deleteMany({ where: { userId } });
      await tx.researchConsent.deleteMany({ where: { userId } });
      if (key) await tx.researchResponse.deleteMany({ where: { code: researchCode(key, userId) } });
      const removed = { messageEn: '[removed]', messageAr: '[حُذف]' };
      await tx.kudo.updateMany({ where: { fromUserId: userId }, data: removed });
      await tx.kudo.updateMany({ where: { toUserId: userId }, data: removed });
      const files = await tx.questSubmission.findMany({ where: { employeeId: userId, fileId: { not: null } }, select: { fileId: true } });
      await tx.questSubmission.updateMany({
        where: { employeeId: userId },
        data: { notes: null, fileName: null, fileId: null, fileType: null, fileSize: null },
      });
      await deleteStoredFiles(tx, files.map((f) => f.fileId));
      // Audit entries stay (they're the record of what happened) but lose personal details in their metadata.
      await tx.$executeRaw`UPDATE "AuditLog" SET "metadata" = "metadata" - 'email' - 'reason' WHERE "targetId" = ${userId} AND "metadata" IS NOT NULL`;
    });


    await logAudit(this.prisma, { actorId, action: 'user.erased', targetType: 'User', targetId: userId });
    return { erased: true };
  }

  // ----------------------------------------------------------------- retention

  @Cron('0 3 * * *', { name: 'retention' })
  async scheduledRetention() {
    if (!retentionPolicy().jobEnabled) return;
    try {
      const result = await this.runRetention(null);
      this.logger.log(`Retention run: ${JSON.stringify(result)}`);
    } catch (err) {
      this.logger.error('Retention run failed', err instanceof Error ? err.stack : String(err));
    }
  }

  async runRetention(actorId: string | null): Promise<RetentionRunResult> {
    const policy = retentionPolicy();
    const now = Date.now();

    const sessions = await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date(now) } }, { revokedAt: { lt: new Date(now - policy.revokedSessionsDays * DAY_MS) } }] },
    });
    const notifications = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: new Date(now - policy.notificationsDays * DAY_MS) } },
    });
    const due = await this.prisma.user.findMany({
      where: { isActive: false, erasedAt: null, deactivatedAt: { lt: new Date(now - policy.deactivatedAccountsDays * DAY_MS) } },
      select: { id: true },
    });
    for (const u of due) await this.erase(u.id, null);

    const result = { sessionsDeleted: sessions.count, notificationsDeleted: notifications.count, accountsAnonymised: due.length };
    await logAudit(this.prisma, { actorId, action: 'retention.ran', targetType: 'System', metadata: { ...result } });
    return result;
  }
}
