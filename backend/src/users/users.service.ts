import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { SquadChallengesService } from '../squads/squad-challenges.service';
import { XpLedgerService } from '../ledger/xp-ledger.service';
import { randomUUID } from 'crypto';
import { hashPassword } from '../common/utils/password-hash';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AwardXpDto } from './dto/award-xp.dto';
import { toStaffMemberDto } from '../common/utils/staff-member.mapper';
import { buildStaffMemberDto } from '../common/utils/build-staff-member';
import { ZERO_PERIOD_STATS } from '../common/utils/xp-period.util';
import { initialsFrom, pickAvatarTone, generateStaffId } from '../common/utils/identity.util';
import { generateTempPassword } from '../common/utils/temp-password.util';
import { syncManagerRoles } from '../common/utils/sync-manager-roles.util';
import { logAudit } from '../common/utils/audit.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { StaffMemberDto } from '../common/dto/staff-member.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private badges: BadgesService,
    private squadChallenges: SquadChallengesService,
    private ledger: XpLedgerService,
  ) {}

  /** Admin: every user, optionally filtered by the requested department. Manager: always their own department's roster, ignoring whatever was requested — same "own department only" boundary as Quests/Departments. */
  async findAllForViewer(viewer: AuthenticatedUser, requestedDepartmentId?: string): Promise<StaffMemberDto[]> {
    let departmentId = requestedDepartmentId;
    if (viewer.role === 'manager') {
      const dept = await this.prisma.department.findFirst({ where: { managerId: viewer.id } });
      if (!dept) throw new ForbiddenException("You don't manage a department.");
      departmentId = dept.id;
    }
    return this.findAll(departmentId, viewer.role === 'admin');
  }

  private async findAll(departmentId: string | undefined, includeDemographics: boolean): Promise<StaffMemberDto[]> {
    // Deactivated (soft-deleted) users are excluded here, same as the demo's
    // hard-delete made them disappear from this list — their row and history
    // still exist in the DB (and will surface in the Phase F audit trail),
    // just not in the active roster view.
    const where = { isActive: true, ...(departmentId ? { departmentId } : {}) };
    const users = await this.prisma.user.findMany({ where, include: { department: true }, orderBy: { nameEn: 'asc' } });
    const badgeRows = await this.prisma.userBadge.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
      select: { userId: true, badgeId: true },
    });

    const badgesByUser = new Map<string, string[]>();
    for (const row of badgeRows) {
      const list = badgesByUser.get(row.userId) ?? [];
      list.push(row.badgeId);
      badgesByUser.set(row.userId, list);
    }

    // Zeroed period stats here — the Users table doesn't render them, and
    // computing per row would be an N+1 aggregate query for no visible gain.
    return users.map((u) => {
      const dto = toStaffMemberDto(u, u.department, ZERO_PERIOD_STATS, badgesByUser.get(u.id) ?? []);
      // Demographics are for the Admin's user management only — a Manager's team roster never gets them.
      return includeDemographics ? { ...dto, generation: u.generation, staffType: u.staffType } : dto;
    });
  }

  async create(dto: CreateUserDto, actorId: string): Promise<{ user: StaffMemberDto; temporaryPassword: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('A user with this email already exists.');

    const temporaryPassword = generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const userCount = await this.prisma.user.count();
    const startingXp = dto.startingXp ?? 0;

    const user = await this.prisma.user.create({
      data: {
        staffId: generateStaffId(),
        nameEn: dto.nameEn,
        nameAr: dto.nameAr || dto.nameEn,
        initials: initialsFrom(dto.nameEn),
        titleEn: dto.titleEn ?? '',
        titleAr: dto.titleEn ?? '',
        email: dto.email,
        passwordHash,
        role: dto.role,
        gender: dto.gender ?? 'male',
        generation: dto.generation ?? null,
        staffType: dto.staffType ?? null,
        departmentId: dto.departmentId ?? null,
        avatarTone: pickAvatarTone(userCount),
        totalXp: 0, // set by the ledger below
        mustChangePassword: true,
      },
    });

    // Keep the ActivityLog ledger authoritative for totalXp (see the Phase A
    // schema review) — a starting balance is still an XP event, not a freebie.
    if (startingXp > 0) {
      await this.prisma.$transaction(async (tx) => {
        await this.ledger.record(tx, {
          userId: user.id,
          amount: startingXp,
          source: 'starting_balance',
          idempotencyKey: `start:${user.id}`,
          actorId,
        });
        await tx.activityLog.create({
          data: { userId: user.id, kind: 'xp', textEn: 'Starting balance', textAr: 'الرصيد الابتدائي', xpDelta: startingXp },
        });
      });
    }

    await syncManagerRoles(this.prisma);
    await logAudit(this.prisma, {
      actorId,
      action: 'user.created',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return { user: await this.adminView(user.id), temporaryPassword };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<StaffMemberDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found.');

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) throw new BadRequestException('A user with this email already exists.');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        initials: dto.nameEn ? initialsFrom(dto.nameEn) : undefined,
        email: dto.email,
        titleEn: dto.titleEn,
        titleAr: dto.titleEn,
        role: dto.role,
        gender: dto.gender,
        generation: dto.generation,
        staffType: dto.staffType,
        isActive: dto.isActive,
        // Start (or clear) the retention clock when an account is deactivated (or reactivated).
        deactivatedAt: dto.isActive === undefined ? undefined : dto.isActive ? null : existing.isActive ? new Date() : existing.deactivatedAt,
        departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
      },
    });

    // Soft-deleting (or otherwise deactivating) a department's manager
    // vacates that department, same as the demo's deleteUser did.
    if (dto.isActive === false) {
      await this.prisma.department.updateMany({ where: { managerId: id }, data: { managerId: null } });
    }

    await syncManagerRoles(this.prisma);
    await logAudit(this.prisma, { actorId, action: 'user.updated', targetType: 'User', targetId: id });

    return this.adminView(id);
  }

  /** Soft delete — sets isActive: false rather than removing the row, to preserve audit/history (per the spec). */
  async deactivate(id: string, actorId: string): Promise<{ deactivated: boolean }> {
    if (id === actorId) throw new BadRequestException("You can't deactivate your own account.");

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found.');

    await this.prisma.user.update({ where: { id }, data: { isActive: false, deactivatedAt: new Date() } });
    await this.prisma.department.updateMany({ where: { managerId: id }, data: { managerId: null } });
    await syncManagerRoles(this.prisma);
    await logAudit(this.prisma, {
      actorId,
      action: 'user.deactivated',
      targetType: 'User',
      targetId: id,
      metadata: { email: existing.email },
    });

    return { deactivated: true };
  }

  /**
   * Admin XP adjustment through the ledger. Deductions never take a balance below 0, and the
   * amount actually applied is what gets recorded and shown. An Idempotency-Key (sent by the admin
   * dialog) makes a double-click or retry return the first result instead of awarding twice.
   */
  async awardXp(id: string, dto: AwardXpDto, actorId: string, idempotencyKey?: string): Promise<StaffMemberDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found.');

    const result = await this.prisma.$transaction(async (tx) => {
      const r = await this.ledger.record(tx, {
        userId: id,
        amount: dto.amount,
        source: 'admin_adjustment',
        idempotencyKey: `admin:${idempotencyKey ?? randomUUID()}`,
        actorId,
        clampAtZero: true,
      });
      if (r.duplicate || r.applied === 0) return r;

      const sign = r.applied >= 0 ? '+' : '';
      await tx.activityLog.create({
        data: {
          userId: id,
          kind: 'xp',
          textEn: dto.reason || 'XP adjustment',
          textAr: dto.reason || 'تعديل نقاط الخبرة',
          xpDelta: r.applied,
        },
      });
      await tx.notification.create({
        data: {
          userId: id,
          kind: 'xp',
          titleEn: `${sign}${r.applied} XP`,
          titleAr: `${sign}${r.applied} نقطة خبرة`,
          bodyEn: dto.reason || 'Awarded by an administrator.',
          bodyAr: dto.reason || 'مُنحت من قبل مسؤول النظام.',
        },
      });
      return r;
    });

    if (!result.duplicate && result.applied !== 0) {
      await logAudit(this.prisma, {
        actorId,
        action: 'user.xpAwarded',
        targetType: 'User',
        targetId: id,
        metadata: { amount: result.applied, requested: dto.amount, reason: dto.reason ?? null },
      });
      await this.badges.evaluate(id);
      await this.squadChallenges.evaluateForUser(id); // may complete a squad challenge
    }
    return buildStaffMemberDto(this.prisma, id, { includePeriodStats: false });
  }

  /**
   * There's no way to recover someone's existing password — it's stored as a
   * one-way bcrypt hash, never in plaintext — so "retrieve it" isn't possible
   * by design. This is the real equivalent: issue a new temporary password
   * (same one-time-reveal flow as account creation), force a change on next
   * login, and revoke every refresh token this account currently holds so
   * any session signed in with the old password is cut off immediately.
   */
  async resetPassword(id: string, actorId: string): Promise<{ user: StaffMemberDto; temporaryPassword: string }> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found.');

    const temporaryPassword = generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } }),
      this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    await logAudit(this.prisma, {
      actorId,
      action: 'user.passwordReset',
      targetType: 'User',
      targetId: id,
      metadata: { email: existing.email },
    });

    return { user: await buildStaffMemberDto(this.prisma, id, { includePeriodStats: false }), temporaryPassword };
  }

  /** The user as the Admin's user management sees them: the normal profile plus the optional demographic fields. */
  private async adminView(id: string): Promise<StaffMemberDto> {
    const [dto, row] = await Promise.all([
      buildStaffMemberDto(this.prisma, id, { includePeriodStats: false }),
      this.prisma.user.findUniqueOrThrow({ where: { id }, select: { generation: true, staffType: true } }),
    ]);
    return { ...dto, generation: row.generation, staffType: row.staffType };
  }
}
