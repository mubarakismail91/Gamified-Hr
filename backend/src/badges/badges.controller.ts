import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { AwardBadgeDto } from './dto/award-badge.dto';
import { SetFeaturedBadgesDto } from './dto/set-featured-badges.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('badges')
export class BadgesController {
  constructor(private badges: BadgesService) {}

  // Every role can view the catalog (Employee's Badge Gallery, Admin's award picker).
  @Get()
  findAll() {
    return this.badges.findAll();
  }

  // The Employee's own gallery: earned status plus real progress per requirement.
  @Roles('employee')
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.badges.findAllForEmployee(user.id);
  }

  // Which earned badges appear on the Employee's own leaderboard row (max 4, in this order).
  @Roles('employee')
  @Put('featured')
  setFeatured(@Body() dto: SetFeaturedBadgesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.badges.setFeatured(user.id, dto.badgeIds);
  }

  @Roles('admin')
  @Post('award')
  @HttpCode(HttpStatus.NO_CONTENT)
  award(@Body() dto: AwardBadgeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.badges.award(dto.userId, dto.badgeId, user.id);
  }
}
