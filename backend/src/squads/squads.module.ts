import { Module } from '@nestjs/common';
import { SquadsController } from './squads.controller';
import { SquadsService } from './squads.service';
import { SquadChallengesService } from './squad-challenges.service';

@Module({
  controllers: [SquadsController],
  providers: [SquadsService, SquadChallengesService],
  exports: [SquadChallengesService],
})
export class SquadsModule {}
