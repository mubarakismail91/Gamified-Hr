import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { SquadsService } from './squads.service';
import { SquadChallengesService } from './squad-challenges.service';
import { AddSquadMemberDto, CreateChallengeDto, CreateSquadDto } from './dto/squad.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('squads')
export class SquadsController {
  constructor(
    private squads: SquadsService,
    private challenges: SquadChallengesService,
  ) {}

  @Roles('employee')
  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.squads.mine(user);
  }

  @Roles('manager', 'admin')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.squads.listForStaff(user);
  }

  @Get('candidates')
  candidates(@CurrentUser() user: AuthenticatedUser) {
    return this.squads.candidates(user);
  }

  @Get('leaderboard')
  leaderboard(@CurrentUser() user: AuthenticatedUser, @Query('period') period = 'week') {
    if (period !== 'week' && period !== 'month') throw new BadRequestException('period must be "week" or "month".');
    return this.squads.leaderboard(user, period);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSquadDto) {
    return this.squads.create(user, dto);
  }

  // Challenges (declared before ':id' routes) --------------------------------

  @Get('challenges')
  listChallenges(@CurrentUser() user: AuthenticatedUser) {
    return this.challenges.list(user);
  }

  @Roles('manager', 'admin')
  @Post('challenges')
  createChallenge(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChallengeDto) {
    return this.challenges.create(user, dto);
  }

  @Roles('employee')
  @Post('challenges/:id/join')
  joinChallenge(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.challenges.join(user, id);
  }

  // One squad ------------------------------------------------------------------

  @Post(':id/members')
  addMember(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddSquadMemberDto) {
    return this.squads.addMember(user, id, dto.userId);
  }

  @Roles('employee')
  @Post(':id/invite/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.squads.respondToInvite(user, id, true);
  }

  @Roles('employee')
  @Post(':id/invite/decline')
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.squads.respondToInvite(user, id, false);
  }

  @Delete(':id/members/:userId')
  removeMember(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('userId') userId: string) {
    return this.squads.removeMember(user, id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  disband(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.squads.disband(user, id);
  }
}
