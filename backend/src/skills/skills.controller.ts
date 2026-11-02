import { Body, Controller, Get, Post } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { FollowPathDto } from './dto/follow-path.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('skills')
export class SkillsController {
  constructor(private skills: SkillsService) {}

  // Every role can view the tree; the levels shown are the viewer's own (all zero for roles that don't take quests).
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.skills.findAllForViewer(user.id);
  }

  @Get('paths')
  paths(@CurrentUser() user: AuthenticatedUser) {
    return this.skills.findPaths(user.id);
  }

  @Roles('employee')
  @Post('paths')
  follow(@Body() dto: FollowPathDto, @CurrentUser() user: AuthenticatedUser) {
    return this.skills.followPath(user.id, dto.branch);
  }
}
