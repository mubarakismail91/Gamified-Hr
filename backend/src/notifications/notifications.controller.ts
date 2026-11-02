import { Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.findMine(user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markRead(id, user.id);
  }
}
