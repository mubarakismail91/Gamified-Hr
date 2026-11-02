import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { KudosService } from './kudos.service';
import { SendKudoDto } from './dto/send-kudo.dto';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('kudos')
export class KudosController {
  constructor(private kudos: KudosService) {}

  @Get()
  findAll() {
    return this.kudos.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  send(@Body() dto: SendKudoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kudos.send(dto, user.id);
  }
}
