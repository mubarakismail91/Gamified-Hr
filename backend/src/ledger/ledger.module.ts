import { Global, Module } from '@nestjs/common';
import { XpLedgerService } from './xp-ledger.service';
import { LedgerController } from './ledger.controller';

/** Global so every module that changes XP can inject XpLedgerService. */
@Global()
@Module({
  controllers: [LedgerController],
  providers: [XpLedgerService],
  exports: [XpLedgerService],
})
export class LedgerModule {}
