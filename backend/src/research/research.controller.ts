import { Controller, Delete, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ResearchService, type CsvExport } from './research.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

function sendCsv(res: Response, file: CsvExport): string {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
  res.setHeader('Cache-Control', 'no-store');
  return file.csv;
}

@Controller('research')
export class ResearchController {
  constructor(private research: ResearchService) {}

  // --- Employees: their own consent to the research track -------------------

  @Roles('employee')
  @Get('consent')
  myConsent(@CurrentUser() user: AuthenticatedUser) {
    return this.research.getMyConsent(user.id);
  }

  @Roles('employee')
  @Post('consent')
  consent(@CurrentUser() user: AuthenticatedUser) {
    return this.research.giveConsent(user.id);
  }

  @Roles('employee')
  @Delete('consent')
  withdraw(@CurrentUser() user: AuthenticatedUser) {
    return this.research.withdrawConsent(user.id);
  }

  // --- Admin: status and exports (every export is written to the audit trail) --

  @Roles('admin')
  @Get('status')
  status() {
    return this.research.status();
  }

  @Roles('admin')
  @Get('export/participants')
  async exportParticipants(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    return sendCsv(res, await this.research.exportParticipants(user.id));
  }

  @Roles('admin')
  @Get('export/aggregates')
  async exportAggregates(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    return sendCsv(res, await this.research.exportAggregates(user.id));
  }
}
