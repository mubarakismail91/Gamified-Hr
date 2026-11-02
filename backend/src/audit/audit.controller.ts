import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';

@Roles('admin')
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 200;
    return this.audit.findAll(Number.isFinite(n) && n > 0 ? n : 200);
  }
}
