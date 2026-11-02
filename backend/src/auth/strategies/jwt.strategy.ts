import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
}

/**
 * Runs on every non-@Public() request: pulls the access token out of the
 * `Authorization: Bearer <token>` header, verifies its signature/expiry, then
 * re-checks the user is still active (a deactivated account's existing
 * access token stops working within its own 15-minute lifetime, not just at
 * next login).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is no longer active.');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
