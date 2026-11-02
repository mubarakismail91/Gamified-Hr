import { Controller, Get, Param } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

// Any signed-in role may view a colleague's profile; there are deliberately no write routes here.
@Controller('profiles')
export class ProfilesController {
  constructor(private profiles: ProfilesService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.profiles.findOne(id, viewer);
  }
}
