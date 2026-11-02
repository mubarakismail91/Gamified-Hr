import { Module } from '@nestjs/common';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {}
