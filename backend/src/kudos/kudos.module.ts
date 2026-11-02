import { Module } from '@nestjs/common';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [KudosController],
  providers: [KudosService],
})
export class KudosModule {}
