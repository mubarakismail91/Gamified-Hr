import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private departments: DepartmentsService) {}

  @Roles('admin', 'manager')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.departments.findAllForViewer(user);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.departments.create(dto, user.id);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.departments.update(id, dto, user.id);
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.departments.remove(id, user.id);
  }
}
