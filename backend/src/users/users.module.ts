import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BadgesModule } from '../badges/badges.module';
import { SquadsModule } from '../squads/squads.module';

@Module({
  imports: [BadgesModule, SquadsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
