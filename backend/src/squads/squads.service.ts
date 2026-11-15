import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { logAudit } from '../common/utils/audit.util';
import { getPeriodXpStatsBatch } from '../common/utils/xp-period.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MAX_SQUAD_SIZE, MIN_RANKED_MEMBERS, isUniqueViolation } from './squad-rules';
import type { CreateSquadDto, MySquadsDto, SquadDto, SquadLeaderboardRowDto, SquadPersonDto } from './dto/squad.dto';

const UNIVERSITY_WIDE = { en: 'University-wide', ar: 'على مستوى الجامعة' };

const squadInclude = {
  createdBy: { select: { id: true, nameEn: true, nameAr: true, role: true } },
  members: {
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.SquadInclude;

type SquadRow = Prisma.SquadGetPayload<{ include: typeof squadInclude }>;
type PersonRow = SquadRow['members'][number]['user'];

function person(u: PersonRow): SquadPersonDto {
  return {
    id: u.id,
    name: { en: u.nameEn, ar: u.nameAr },
    initials: u.initials,
    avatarTone: u.avatarTone,
    department: u.department ? { en: u.department.nameEn, ar: u.department.nameAr } : UNIVERSITY_WIDE,
  };
}

/**
 * Squads (FR9): small cross-department teams.
 * - An EMPLOYEE creates a squad (becoming its first member) and INVITES colleagues; invitees accept or decline.
 * - A MANAGER (own-department employees only) or ADMIN (anyone) creates squads and ADDS members directly.
 * - Everyone may leave; whoever created the squad (or an admin) may remove members or disband it.
 */
@Injectable()
export class SquadsService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------- reading

  async mine(viewer: AuthenticatedUser): Promise<MySquadsDto> {
    const rows = await this.prisma.squad.findMany({
      where: { members: { some: { userId: viewer.id } } },
      include: squadInclude,
    });
    const statusIn = (s: SquadRow) => s.members.find((m) => m.userId === viewer.id)?.status;
    const active = rows.find((s) => statusIn(s) === 'active');
    return {
      squad: active ? this.toDto(active, viewer) : null,
      invites: rows.filter((s) => statusIn(s) === 'invited').map((s) => this.toDto(s, viewer)),
    };
  }

  /** Admin: every squad. Manager: squads they created or that include someone from their department. */
  async listForStaff(viewer: AuthenticatedUser): Promise<SquadDto[]> {
    let where: Prisma.SquadWhereInput = {};
    if (viewer.role === 'manager') {
      const dept = await this.prisma.department.findFirst({ where: { managerId: viewer.id } });
      where = {
        OR: [{ createdById: viewer.id }, ...(dept ? [{ members: { some: { user: { departmentId: dept.id } } } }] : [])],
      };
    }
    const rows = await this.prisma.squad.findMany({ where, include: squadInclude, orderBy: { createdAt: 'desc' } });
    return rows.map((s) => this.toDto(s, viewer));
  }

  /** People the viewer could invite/add: active employees who aren't in an active squad (managers: own department only). */
  async candidates(viewer: AuthenticatedUser): Promise<SquadPersonDto[]> {
    const deptId = viewer.role === 'manager' ? await this.managedDepartmentId(viewer) : undefined;
    const users = await this.prisma.user.findMany({
      where: {
        role: 'employee',
        isActive: true,
        id: { not: viewer.id },
        squadMemberships: { none: { status: 'active' } },
        ...(deptId ? { departmentId: deptId } : {}),
      },
      include: { department: true },
      orderBy: { nameEn: 'asc' },
    });
    return users.map(person);
  }

  /** Team leaderboard: squads with at least MIN_RANKED_MEMBERS active members, by average XP per member in the period. */
  async leaderboard(viewer: AuthenticatedUser, period: 'week' | 'month'): Promise<SquadLeaderboardRowDto[]> {
    const squads = await this.prisma.squad.findMany({ include: squadInclude });
    const ranked = squads
      .map((s) => ({ s, active: s.members.filter((m) => m.status === 'active' && m.user.isActive) }))
      .filter((x) => x.active.length >= MIN_RANKED_MEMBERS);
    if (ranked.length === 0) return [];

    const stats = await getPeriodXpStatsBatch(
      this.prisma,
      ranked.flatMap((x) => x.active.map((m) => m.userId)),
    );
    const rows = ranked.map(({ s, active }) => {
      const totalXp = active.reduce((sum, m) => {
        const st = stats.get(m.userId);
        return sum + (period === 'week' ? st?.pointsThisWeek ?? 0 : st?.pointsThisMonth ?? 0);
      }, 0);
      return {
        squadId: s.id,
        name: s.name,
        memberCount: active.length,
        departmentCount: new Set(active.map((m) => m.user.departmentId ?? 'none')).size,
        totalXp,
        avgXp: Math.round(totalXp / active.length),
        members: active.map((m) => person(m.user)),
        isMine: active.some((m) => m.userId === viewer.id),
      };
    });
    rows.sort((a, b) => b.avgXp - a.avgXp || b.totalXp - a.totalXp || a.name.localeCompare(b.name));
    return rows.map((r, i) => ({ ...r, position: i + 1 }));
  }

  // ---------------------------------------------------------------- writing

  async create(viewer: AuthenticatedUser, dto: CreateSquadDto): Promise<SquadDto> {
    const others = [...new Set(dto.memberIds ?? [])].filter((id) => id !== viewer.id);
    const isEmployee = viewer.role === 'employee';

    if (isEmployee && (await this.activeSquadOf(viewer.id))) {
      throw new BadRequestException('Leave your current squad before creating a new one.');
    }
    if (others.length + (isEmployee ? 1 : 0) > MAX_SQUAD_SIZE) {
      throw new BadRequestException(`A squad can have at most ${MAX_SQUAD_SIZE} members.`);
    }
    for (const id of others) await this.assertEligible(viewer, id);

    let squad: SquadRow;
    try {
      squad = await this.prisma.squad.create({
        data: {
          name: dto.name.trim(),
          createdById: viewer.id,
          members: {
            create: [
              ...(isEmployee ? [{ userId: viewer.id, status: 'active' as const, joinedAt: new Date() }] : []),
              ...others.map((userId) =>
                isEmployee
                  ? { userId, status: 'invited' as const, invitedById: viewer.id }
                  : { userId, status: 'active' as const, invitedById: viewer.id, joinedAt: new Date() },
              ),
            ],
          },
        },
        include: squadInclude,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new BadRequestException('Someone you added just joined another squad.');
      throw err;
    }

    await this.notifyMany(others, isEmployee ? 'invited' : 'added', squad.name, viewer.id);
    await logAudit(this.prisma, {
      actorId: viewer.id,
      action: 'squad.created',
      targetType: 'Squad',
      targetId: squad.id,
      metadata: { name: squad.name, members: others.length + (isEmployee ? 1 : 0) },
    });
    return this.toDto(squad, viewer);
  }

  /** The squad's employee creator INVITES; a manager/admin who can manage it ADDS directly. */
  async addMember(viewer: AuthenticatedUser, squadId: string, userId: string): Promise<SquadDto> {
    const squad = await this.squadOrThrow(squadId);
    if (!this.canManage(squad, viewer)) throw new ForbiddenException("You can't change this squad's members.");
    if (squad.members.some((m) => m.userId === userId)) throw new BadRequestException('This person is already in the squad or invited.');
    if (squad.members.length >= MAX_SQUAD_SIZE) throw new BadRequestException(`A squad can have at most ${MAX_SQUAD_SIZE} members.`);

    const direct = viewer.role !== 'employee';
    await this.assertEligible(viewer, userId);
    try {
      await this.prisma.squadMember.create({
        data: direct
          ? { squadId, userId, status: 'active', invitedById: viewer.id, joinedAt: new Date() }
          : { squadId, userId, status: 'invited', invitedById: viewer.id },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new BadRequestException('This person is already in another squad.');
      throw err;
    }
    await this.notifyMany([userId], direct ? 'added' : 'invited', squad.name, viewer.id);
    return this.toDto(await this.squadOrThrow(squadId), viewer);
  }

  async respondToInvite(viewer: AuthenticatedUser, squadId: string, accept: boolean): Promise<MySquadsDto> {
    const invite = await this.prisma.squadMember.findUnique({ where: { squadId_userId: { squadId, userId: viewer.id } } });
    if (!invite || invite.status !== 'invited') throw new NotFoundException('Invitation not found.');

    if (!accept) {
      await this.prisma.squadMember.delete({ where: { id: invite.id } });
      return this.mine(viewer);
    }
    try {
      // The partial unique index rejects this if the viewer is already active in another squad.
      await this.prisma.squadMember.update({ where: { id: invite.id }, data: { status: 'active', joinedAt: new Date() } });
    } catch (err) {
      if (isUniqueViolation(err)) throw new BadRequestException('Leave your current squad before joining another.');
      throw err;
    }
    const squad = await this.squadOrThrow(squadId);
    const me = squad.members.find((m) => m.userId === viewer.id)!.user;
    await this.prisma.notification.create({
      data: {
        userId: squad.createdById,
        kind: 'social',
        titleEn: 'Squad invitation accepted',
        titleAr: 'قُبلت دعوة الفريق',
        bodyEn: `${me.nameEn} joined "${squad.name}".`,
        bodyAr: `انضم ${me.nameAr} إلى "${squad.name}".`,
      },
    });
    return this.mine(viewer);
  }

  /** Leaving (removing yourself) is always allowed; removing someone else needs canManage. Empty squads are deleted. */
  async removeMember(viewer: AuthenticatedUser, squadId: string, userId: string): Promise<{ disbanded: boolean }> {
    const squad = await this.squadOrThrow(squadId);
    const self = userId === viewer.id;
    if (!self && !this.canManage(squad, viewer)) throw new ForbiddenException("You can't remove members from this squad.");
    const member = squad.members.find((m) => m.userId === userId);
    if (!member) throw new NotFoundException('This person is not in the squad.');

    await this.prisma.squadMember.delete({ where: { id: member.id } });
    if (!self && member.status === 'active') await this.notifyMany([userId], 'removed', squad.name, viewer.id);

    const remainingActive = squad.members.filter((m) => m.status === 'active' && m.userId !== userId).length;
    if (remainingActive === 0 && squad.createdBy.role === 'employee') {
      await this.prisma.squad.delete({ where: { id: squadId } });
      return { disbanded: true };
    }
    return { disbanded: false };
  }

  async disband(viewer: AuthenticatedUser, squadId: string): Promise<void> {
    const squad = await this.squadOrThrow(squadId);
    if (!this.canManage(squad, viewer)) throw new ForbiddenException("You can't disband this squad.");
    const others = squad.members.filter((m) => m.status === 'active' && m.userId !== viewer.id).map((m) => m.userId);
    await this.prisma.squad.delete({ where: { id: squadId } });
    await this.notifyMany(others, 'disbanded', squad.name, viewer.id);
    await logAudit(this.prisma, {
      actorId: viewer.id,
      action: 'squad.disbanded',
      targetType: 'Squad',
      targetId: squadId,
      metadata: { name: squad.name },
    });
  }

  // ---------------------------------------------------------------- helpers

  async activeSquadOf(userId: string) {
    return this.prisma.squadMember.findFirst({ where: { userId, status: 'active' } });
  }

  private canManage(squad: SquadRow, viewer: AuthenticatedUser): boolean {
    if (viewer.role === 'admin') return true;
    if (squad.createdById !== viewer.id) return false;
    // An employee creator manages it only while they're still an active member.
    return viewer.role === 'manager' || squad.members.some((m) => m.userId === viewer.id && m.status === 'active');
  }

  private async managedDepartmentId(viewer: AuthenticatedUser): Promise<string> {
    const dept = await this.prisma.department.findFirst({ where: { managerId: viewer.id } });
    if (!dept) throw new ForbiddenException("You don't manage a department.");
    return dept.id;
  }

  /** Active employee, not already active in a squad, and (for managers) from their own department. */
  private async assertEligible(viewer: AuthenticatedUser, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.role !== 'employee') throw new BadRequestException('Only active employees can be in a squad.');
    if (viewer.role === 'manager' && user.departmentId !== (await this.managedDepartmentId(viewer))) {
      throw new ForbiddenException('Managers can only add people from their own department.');
    }
    if (await this.activeSquadOf(userId)) {
      throw new BadRequestException(`${user.nameEn} is already in a squad.`);
    }
  }

  private async squadOrThrow(id: string): Promise<SquadRow> {
    const squad = await this.prisma.squad.findUnique({ where: { id }, include: squadInclude });
    if (!squad) throw new NotFoundException('Squad not found.');
    return squad;
  }

  private async notifyMany(userIds: string[], kind: 'invited' | 'added' | 'removed' | 'disbanded', squadName: string, actorId: string) {
    if (userIds.length === 0) return;
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { nameEn: true, nameAr: true } });
    const by = { en: actor?.nameEn ?? '', ar: actor?.nameAr ?? '' };
    const text = {
      invited: {
        titleEn: 'Squad invitation',
        titleAr: 'دعوة إلى فريق',
        bodyEn: `${by.en} invited you to join "${squadName}". Open Squads to accept or decline.`,
        bodyAr: `دعاك ${by.ar} للانضمام إلى "${squadName}". افتح صفحة الفرق للقبول أو الرفض.`,
      },
      added: {
        titleEn: 'Added to a squad',
        titleAr: 'أُضفت إلى فريق',
        bodyEn: `${by.en} added you to "${squadName}". You can leave at any time from Squads.`,
        bodyAr: `أضافك ${by.ar} إلى "${squadName}". يمكنك المغادرة في أي وقت من صفحة الفرق.`,
      },
      removed: {
        titleEn: 'Removed from a squad',
        titleAr: 'أُزلت من فريق',
        bodyEn: `You are no longer in "${squadName}".`,
        bodyAr: `لم تعد عضوًا في "${squadName}".`,
      },
      disbanded: {
        titleEn: 'Squad disbanded',
        titleAr: 'حُلّ الفريق',
        bodyEn: `"${squadName}" was disbanded.`,
        bodyAr: `حُلّ فريق "${squadName}".`,
      },
    }[kind];
    await this.prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, kind: 'social' as const, ...text })) });
  }

  private toDto(s: SquadRow, viewer: AuthenticatedUser): SquadDto {
    const activeCount = s.members.filter((m) => m.status === 'active').length;
    return {
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      createdBy: { id: s.createdBy.id, name: { en: s.createdBy.nameEn, ar: s.createdBy.nameAr }, role: s.createdBy.role },
      members: s.members.map((m) => ({ user: person(m.user), status: m.status, joinedAt: m.joinedAt })),
      activeCount,
      ranked: activeCount >= MIN_RANKED_MEMBERS,
      canManage: this.canManage(s, viewer),
    };
  }
}
