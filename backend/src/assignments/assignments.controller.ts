import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AcceptQuestDto } from './dto/accept-quest.dto';
import { RejectAssignmentDto } from './dto/reject-assignment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('assignments')
export class AssignmentsController {
  constructor(private assignments: AssignmentsService) {}

  @Roles('employee')
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.assignments.findMine(user.id);
  }

  @Roles('manager', 'admin')
  @Get('pending')
  pending(@CurrentUser() user: AuthenticatedUser, @Query('departmentId') departmentId?: string) {
    return this.assignments.pendingApprovals(user, departmentId);
  }

  @Roles('manager', 'admin')
  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser, @Query('departmentId') departmentId?: string) {
    return this.assignments.history(user, departmentId);
  }

  @Roles('employee')
  @Post()
  accept(@Body() dto: AcceptQuestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assignments.accept(dto.questId, user);
  }

  @Roles('employee')
  @Patch(':id/advance')
  advance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignments.advance(id, user);
  }

  @Roles('employee')
  @Patch(':id/subtasks/:subtaskId')
  toggleSubtask(@Param('id') id: string, @Param('subtaskId') subtaskId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignments.toggleSubtask(id, subtaskId, user);
  }

  @Roles('manager', 'admin')
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignments.approve(id, user);
  }

  @Roles('manager', 'admin')
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectAssignmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assignments.reject(id, dto.note, user);
  }
}
