import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { KudosService } from './kudos.service';
import { SendKudoDto } from './dto/send-kudo.dto';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('kudos')
export class KudosController {
  constructor(private kudos: KudosService) {}

  /** The latest Kudos across the university (default 50, at most 200); `received=true` = only those sent to me. */
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string, @Query('received') received?: string) {
    const n = Math.min(200, Math.max(1, Number(limit) || 50));
    return this.kudos.findAll(n, received === 'true' ? user.id : undefined);
  }

  @Get('received-count')
  receivedCount(@CurrentUser() user: AuthenticatedUser) {
    return this.kudos.receivedCount(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  send(@Body() dto: SendKudoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kudos.send(dto, user.id);
  }
}
