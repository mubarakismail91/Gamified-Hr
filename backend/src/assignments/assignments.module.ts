import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
