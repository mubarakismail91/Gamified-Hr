import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService } from '../skills/skills.service';
import { toBadgeDto } from '../common/utils/badge.mapper';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { PublicProfileDto } from './dto/public-profile.dto';

const UNIVERSITY_WIDE = { en: 'University-wide', ar: 'على مستوى الجامعة' };
const RECENT_KUDOS_LIMIT = 10;

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private skills: SkillsService,
  ) {}

  /** Read-only by construction: this service only ever reads, and the controller exposes no write routes. */
  async findOne(userId: string, viewer: AuthenticatedUser): Promise<PublicProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { department: true } });
    if (!user || !user.isActive) throw new NotFoundException('Profile not found.');

    const isSelf = user.id === viewer.id;
    const isEmployee = user.role === 'employee';
    const hasEngagement = user.role !== 'admin';

    const [kudosReceived, kudos, earned, totalBadges, questsCompleted, skills] = await Promise.all([
      hasEngagement ? this.prisma.kudo.count({ where: { toUserId: user.id } }) : 0,
      hasEngagement
        ? this.prisma.kudo.findMany({
            where: { toUserId: user.id },
            orderBy: { createdAt: 'desc' },
            take: RECENT_KUDOS_LIMIT,
            include: { fromUser: true },
          })
        : [],
      isEmployee
        ? this.prisma.userBadge.findMany({
            where: { userId: user.id },
            include: { badge: true },
            orderBy: { awardedAt: 'desc' },
          })
        : [],
      isEmployee ? this.prisma.badge.count() : 0,
      isEmployee ? this.prisma.questAssignment.count({ where: { employeeId: user.id, status: 'completed' } }) : 0,
      isEmployee ? this.skills.findAllForViewer(user.id) : null,
    ]);

    return {
      id: user.id,
      isSelf,
      name: { en: user.nameEn, ar: user.nameAr },
      initials: user.initials,
      title: { en: user.titleEn, ar: user.titleAr },
      department: user.department ? { en: user.department.nameEn, ar: user.department.nameAr } : UNIVERSITY_WIDE,
      college: { en: user.collegeEn, ar: user.collegeAr },
      role: user.role,
      avatarTone: user.avatarTone,
      joined: user.createdAt,
      hasEngagement,
      totalXp: hasEngagement ? user.totalXp : 0,
      kudosReceived,
      questsCompleted: isEmployee ? questsCompleted : null,
      badges: isEmployee ? earned.map((r) => ({ ...toBadgeDto(r.badge), earnedOn: r.awardedAt })) : null,
      totalBadges,
      skills,
      recentKudos: kudos.map((k) => ({
        id: k.id,
        value: k.value,
        message: { en: k.messageEn, ar: k.messageAr },
        at: k.createdAt,
        from: {
          id: k.fromUser.id,
          name: { en: k.fromUser.nameEn, ar: k.fromUser.nameAr },
          initials: k.fromUser.initials,
          avatarTone: k.fromUser.avatarTone,
        },
      })),
      contact:
        isSelf || viewer.role === 'admin'
          ? { email: user.email, staffId: user.staffId, office: { en: user.officeEn, ar: user.officeAr } }
          : null,
    };
  }
}
