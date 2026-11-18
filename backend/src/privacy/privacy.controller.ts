import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrivacyService } from './privacy.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('privacy')
export class PrivacyController {
  constructor(private privacy: PrivacyService) {}

  /** The retention periods in force, for the public Privacy page. */
  @Public()
  @Get('policy')
  policy() {
    return this.privacy.policy();
  }

  /** Right of access: everything held about the signed-in person, as a JSON download. */
  @Get('my-data')
  async myData(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const data = await this.privacy.exportMyData(user.id);
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    return data;
  }

  @Roles('admin')
  @Get('deactivated')
  deactivated() {
    return this.privacy.listDeactivated();
  }

  @Roles('admin')
  @Post('erase/:userId')
  erase(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.privacy.erase(userId, user.id);
  }

  @Roles('admin')
  @Post('retention/run')
  runRetention(@CurrentUser() user: AuthenticatedUser) {
    return this.privacy.runRetention(user.id);
  }
}
