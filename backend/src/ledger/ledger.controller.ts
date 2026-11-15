import { Controller, Get, Param } from '@nestjs/common';
import { XpLedgerService } from './xp-ledger.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { logAudit } from '../common/utils/audit.util';

@Roles('admin')
@Controller('ledger')
export class LedgerController {
  constructor(
    private ledger: XpLedgerService,
    private prisma: PrismaService,
  ) {}

  /** Checks every hash chain and that totals agree; the result is recorded in the audit trail. */
  @Get('verify')
  async verify(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.ledger.verify();
    await logAudit(this.prisma, {
      actorId: user.id,
      action: 'ledger.verified',
      targetType: 'System',
      metadata: { ok: result.ok, users: result.checkedUsers, rows: result.checkedRows, problems: result.problems.length },
    });
    return result;
  }

  @Get('users/:id')
  history(@Param('id') id: string) {
    return this.ledger.history(id);
  }
}
