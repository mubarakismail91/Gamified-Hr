import { Module } from '@nestjs/common';
import { SurveysModule } from '../surveys/surveys.module';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';

@Module({
  imports: [SurveysModule],
  controllers: [ResearchController],
  providers: [ResearchService],
})
export class ResearchModule {}
