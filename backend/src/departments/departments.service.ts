import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { toDepartmentDto } from '../common/utils/department.mapper';
import { syncManagerRoles } from '../common/utils/sync-manager-roles.util';
import { logAudit } from '../common/utils/audit.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { DepartmentDto } from '../common/dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  /** Admin sees every department; Manager sees only the one they manage (matches the original spec). */
  async findAllForViewer(viewer: AuthenticatedUser): Promise<DepartmentDto[]> {
    const where = viewer.role === 'admin' ? {} : { managerId: viewer.id };
    const departments = await this.prisma.department.findMany({ where, orderBy: { nameEn: 'asc' } });
    return departments.map(toDepartmentDto);
  }

  async create(dto: CreateDepartmentDto, actorId: string): Promise<DepartmentDto> {
    const dept = await this.prisma.department.create({
      data: { nameEn: dto.nameEn, nameAr: dto.nameAr || dto.nameEn, managerId: dto.managerId || null },
    });
    await syncManagerRoles(this.prisma);
    await logAudit(this.prisma, {
      actorId,
      action: 'department.created',
      targetType: 'Department',
      targetId: dept.id,
      metadata: { nameEn: dept.nameEn },
    });
    return toDepartmentDto(dept);
  }

  async update(id: string, dto: UpdateDepartmentDto, actorId: string): Promise<DepartmentDto> {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found.');

    // Unlike the demo's denormalised `user.department` field, nothing here
    // needs to cascade to Users — StaffMemberDto always joins the live
    // Department row at request time (see staff-member.mapper.ts).
    const dept = await this.prisma.department.update({
      where: { id },
      data: {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        managerId: dto.managerId === undefined ? undefined : dto.managerId,
      },
    });
    await syncManagerRoles(this.prisma);
    await logAudit(this.prisma, {
      actorId,
      action: 'department.updated',
      targetType: 'Department',
      targetId: dept.id,
    });
    return toDepartmentDto(dept);
  }

  async remove(id: string, actorId: string): Promise<{ deleted: boolean }> {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found.');

    const stillOccupied = await this.prisma.user.count({ where: { departmentId: id } });
    if (stillOccupied > 0) {
      throw new BadRequestException('This department still has staff assigned to it.');
    }

    // No quests can exist yet against this department (Quest endpoints land
    // in Phase D) — revisit this delete's cascade behavior once they can.
    await this.prisma.department.delete({ where: { id } });
    await syncManagerRoles(this.prisma);
    await logAudit(this.prisma, {
      actorId,
      action: 'department.deleted',
      targetType: 'Department',
      targetId: id,
      metadata: { nameEn: existing.nameEn },
    });
    return { deleted: true };
  }
}
