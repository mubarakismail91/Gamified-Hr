import { Injectable } from '@nestjs/common';
import type { Skill, SkillBranch } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SkillDto, SkillPathDto } from '../common/dto/skill.dto';

const BRANCHES: SkillBranch[] = ['teaching', 'research', 'leadership', 'digital'];

/**
 * Progress model: each approved quest on a path is one level point, spent on the path's skills in order
 * (row 0 first). A skill is "developed" when full, "in progress" while partly filled, "not started" before.
 */
function toSkillDto(s: Skill, level: number): SkillDto {
  return {
    id: s.id,
    name: { en: s.nameEn, ar: s.nameAr },
    branch: s.branch,
    description: { en: s.descriptionEn, ar: s.descriptionAr },
    state: level >= s.maxLevel ? 'unlocked' : level > 0 ? 'in-progress' : 'locked',
    level,
    maxLevel: s.maxLevel,
    requires: s.requires,
    col: s.col,
    row: s.row,
  };
}

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  /** The catalog with the viewer's own level/state on each skill. */
  async findAllForViewer(userId: string): Promise<SkillDto[]> {
    const [skills, points] = await Promise.all([
      this.prisma.skill.findMany({ orderBy: [{ col: 'asc' }, { row: 'asc' }] }),
      this.pointsByBranch(userId),
    ]);

    const spent = new Map<SkillBranch, number>(); // levels already allotted to earlier skills of the branch
    return skills.map((skill) => {
      const before = spent.get(skill.branch) ?? 0;
      const level = Math.min(skill.maxLevel, Math.max(0, (points.get(skill.branch) ?? 0) - before));
      spent.set(skill.branch, before + skill.maxLevel);
      return toSkillDto(skill, level);
    });
  }

  async findPaths(userId: string): Promise<SkillPathDto[]> {
    const [skills, points, followed] = await Promise.all([
      this.prisma.skill.findMany({ select: { branch: true, maxLevel: true } }),
      this.pointsByBranch(userId),
      this.prisma.userSkillPath.findMany({ where: { userId } }),
    ]);
    const followedSet = new Set(followed.map((f) => f.branch));

    return BRANCHES.map((branch) => ({
      branch,
      followed: followedSet.has(branch) || (points.get(branch) ?? 0) > 0,
      points: points.get(branch) ?? 0,
      total: skills.filter((s) => s.branch === branch).reduce((sum, s) => sum + s.maxLevel, 0),
    }));
  }

  async followPath(userId: string, branch: SkillBranch): Promise<SkillPathDto[]> {
    await this.prisma.userSkillPath.upsert({
      where: { userId_branch: { userId, branch } },
      create: { userId, branch },
      update: {},
    });
    return this.findPaths(userId);
  }

  private async pointsByBranch(userId: string): Promise<Map<SkillBranch, number>> {
    const done = await this.prisma.questAssignment.findMany({
      where: { employeeId: userId, status: 'completed', quest: { skillBranch: { not: null } } },
      select: { quest: { select: { skillBranch: true } } },
    });
    const points = new Map<SkillBranch, number>();
    for (const { quest } of done) {
      if (quest.skillBranch) points.set(quest.skillBranch, (points.get(quest.skillBranch) ?? 0) + 1);
    }
    return points;
  }
}
