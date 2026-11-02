import { Controller, Get } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private activity: ActivityService) {}

  // Everyone sees only their own entries — the user id comes from the token, never the request.
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.activity.findMine(user.id);
  }
}
