import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';

@Roles('admin')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analytics.getOverview();
  }

  @Get('demographics')
  demographics() {
    return this.analytics.getDemographics();
  }
}
