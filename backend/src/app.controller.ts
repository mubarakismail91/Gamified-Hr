import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health check — kept public so uptime monitoring doesn't need a token.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
