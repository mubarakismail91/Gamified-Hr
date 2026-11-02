import { Injectable } from '@nestjs/common';
import type { Skill } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SkillDto } from '../common/dto/skill.dto';

function toSkillDto(s: Skill): SkillDto {
  return {
    id: s.id,
    name: { en: s.nameEn, ar: s.nameAr },
    branch: s.branch,
    description: { en: s.descriptionEn, ar: s.descriptionAr },
    // Prisma enum values can't contain hyphens — "in_progress" round-trips to the frontend's "in-progress".
    state: s.state === 'in_progress' ? 'in-progress' : s.state,
    level: s.level,
    maxLevel: s.maxLevel,
    requires: s.requires,
    col: s.col,
    row: s.row,
  };
}

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<SkillDto[]> {
    const skills = await this.prisma.skill.findMany({ orderBy: [{ col: 'asc' }, { row: 'asc' }] });
    return skills.map(toSkillDto);
  }
}
