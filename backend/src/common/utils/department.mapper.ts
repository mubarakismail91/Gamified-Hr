import type { Department } from '@prisma/client';
import type { DepartmentDto } from '../dto/department.dto';

export function toDepartmentDto(dept: Department): DepartmentDto {
  return { id: dept.id, name: { en: dept.nameEn, ar: dept.nameAr }, managerId: dept.managerId };
}
