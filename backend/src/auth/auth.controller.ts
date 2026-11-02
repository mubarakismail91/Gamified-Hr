import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    return this.auth.login(user.id, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req.cookies?.refreshToken, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.refreshToken, res);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
