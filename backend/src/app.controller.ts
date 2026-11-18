import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
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

  /** 200 when the API and database are both reachable, 503 otherwise (so the host can restart or alert). */
  @Public()
  @SkipThrottle()
  @Get('health')
  async health(@Res({ passthrough: true }) res: Response) {
    const result = await this.appService.health();
    if (result.status !== 'ok') res.status(503);
    return result;
  }
}
