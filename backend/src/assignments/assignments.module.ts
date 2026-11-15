import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { BadgesModule } from '../badges/badges.module';
import { SquadsModule } from '../squads/squads.module';

@Module({
  imports: [BadgesModule, SquadsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
