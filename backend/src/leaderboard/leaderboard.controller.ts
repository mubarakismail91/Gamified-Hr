import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService, type Metric, type Period, type Scope } from './leaderboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

function parsePeriod(period: string): Period {
  if (period !== 'week' && period !== 'month') throw new BadRequestException('Invalid period.');
  return period;
}

// Every role can read the main ranked list — scoped per viewer inside the
// service. The summary-card endpoints (top-performer/top-departments/
// most-improved) are Manager/Admin-only, matching who sees those cards.
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @Get()
  ranked(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period = 'week',
    @Query('metric') metric = 'points',
    @Query('scope') scope = 'dept',
    @Query('departmentId') departmentId?: string,
  ) {
    if (metric !== 'points' && metric !== 'progress') throw new BadRequestException('Invalid metric.');
    if (scope !== 'dept' && scope !== 'uni') throw new BadRequestException('Invalid scope.');
    return this.leaderboard.ranked(user, {
      period: parsePeriod(period),
      metric: metric as Metric,
      scope: scope as Scope,
      departmentId,
    });
  }

  @Roles('admin', 'manager')
  @Get('top-performer')
  topPerformer(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period = 'week',
    @Query('departmentId') departmentId?: string,
  ) {
    return this.leaderboard.topPerformer(user, { period: parsePeriod(period), departmentId });
  }

  @Roles('admin')
  @Get('top-departments')
  topDepartments(@Query('period') period = 'week', @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 3;
    return this.leaderboard.topDepartments(parsePeriod(period), Number.isFinite(n) && n > 0 ? n : 3);
  }

  @Roles('admin')
  @Get('most-improved')
  mostImproved(@Query('period') period = 'week', @Query('departmentId') departmentId?: string) {
    return this.leaderboard.mostImproved(parsePeriod(period), departmentId);
  }
}
