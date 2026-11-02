import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
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
  ) {}

  /** Admin: every user, optionally filtered by the requested department. Manager: always their own department's roster, ignoring whatever was requested — same "own department only" boundary as Quests/Departments. */
  async findAllForViewer(viewer: AuthenticatedUser, requestedDepartmentId?: string): Promise<StaffMemberDto[]> {
    let departmentId = requestedDepartmentId;
    if (viewer.role === 'manager') {
      const dept = await this.prisma.department.findFirst({ where: { managerId: viewer.id } });
      if (!dept) throw new ForbiddenException("You don't manage a department.");
      departmentId = dept.id;
    }
    return this.findAll(departmentId);
  }

  private async findAll(departmentId?: string): Promise<StaffMemberDto[]> {
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
    return users.map((u) => toStaffMemberDto(u, u.department, ZERO_PERIOD_STATS, badgesByUser.get(u.id) ?? []));
  }

  async create(dto: CreateUserDto, actorId: string): Promise<{ user: StaffMemberDto; temporaryPassword: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('A user with this email already exists.');

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
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
        departmentId: dto.departmentId ?? null,
        avatarTone: pickAvatarTone(userCount),
        totalXp: startingXp,
        mustChangePassword: true,
      },
    });

    // Keep the ActivityLog ledger authoritative for totalXp (see the Phase A
    // schema review) — a starting balance is still an XP event, not a freebie.
    if (startingXp > 0) {
      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          kind: 'xp',
          textEn: 'Starting balance',
          textAr: 'الرصيد الابتدائي',
          xpDelta: startingXp,
        },
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

    return { user: await buildStaffMemberDto(this.prisma, user.id, { includePeriodStats: false }), temporaryPassword };
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
        isActive: dto.isActive,
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

    return buildStaffMemberDto(this.prisma, id, { includePeriodStats: false });
  }

  /** Soft delete — sets isActive: false rather than removing the row, to preserve audit/history (per the spec). */
  async deactivate(id: string, actorId: string): Promise<{ deactivated: boolean }> {
    if (id === actorId) throw new BadRequestException("You can't deactivate your own account.");

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found.');

    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
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

  /** Mirrors the demo's awardXp: clamps the resulting total at 0, logs an ActivityLog entry, and notifies the user. */
  async awardXp(id: string, dto: AwardXpDto, actorId: string): Promise<StaffMemberDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found.');

    const newTotal = Math.max(0, existing.totalXp + dto.amount);
    const sign = dto.amount >= 0 ? '+' : '';
    const reasonEn = dto.reason || 'XP adjustment';
    const reasonAr = dto.reason || 'تعديل نقاط الخبرة';

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { totalXp: newTotal } }),
      this.prisma.activityLog.create({
        data: { userId: id, kind: 'xp', textEn: reasonEn, textAr: reasonAr, xpDelta: dto.amount },
      }),
      this.prisma.notification.create({
        data: {
          userId: id,
          kind: 'xp',
          titleEn: `${sign}${dto.amount} XP`,
          titleAr: `${sign}${dto.amount} نقطة خبرة`,
          bodyEn: dto.reason || 'Awarded by an administrator.',
          bodyAr: dto.reason || 'مُنحت من قبل مسؤول النظام.',
        },
      }),
    ]);

    await logAudit(this.prisma, {
      actorId,
      action: 'user.xpAwarded',
      targetType: 'User',
      targetId: id,
      metadata: { amount: dto.amount, reason: dto.reason ?? null },
    });

    await this.badges.evaluate(id);
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
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

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
}
