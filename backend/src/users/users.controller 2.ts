import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AwardXpDto } from './dto/award-xp.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

// Mutations are Admin-only. Reading is also open to Manager — they need
// their own department's roster (Manage Team) — but scoped server-side to
// just that department regardless of what they ask for; see UsersService.
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Roles('admin', 'manager')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('departmentId') departmentId?: string) {
    return this.users.findAllForViewer(user, departmentId);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.create(dto, user.id);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.update(id, dto, user.id);
  }

  @Roles('admin')
  @Delete(':id')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.deactivate(id, user.id);
  }

  @Roles('admin')
  @Post(':id/award-xp')
  awardXp(@Param('id') id: string, @Body() dto: AwardXpDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.awardXp(id, dto, user.id);
  }
}
