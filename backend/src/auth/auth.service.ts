import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { buildStaffMemberDto } from '../common/utils/build-staff-member';
import { generateOpaqueToken, hashToken } from '../common/utils/token.util';
import { parseDurationMs } from '../common/utils/duration.util';
import { assertPasswordAllowed } from './password-policy';
import { hashPassword } from '../common/utils/password-hash';
import type { StaffMemberDto } from '../common/dto/staff-member.dto';

const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Where the refresh cookie is sent back. '/auth' when the browser calls the API directly; '/api/auth'
 * when the frontend reaches the API through a same-site '/api' proxy (Vercel rewrite or Caddy), which
 * keeps the cookie first-party so Safari/Chrome don't block it (item 12).
 */
const cookiePath = () => process.env.COOKIE_PATH ?? '/auth';

/** 'lax' when frontend and API share a site (proxy, or local dev); 'none' only for a cross-site API. */
function cookieSameSite(): 'lax' | 'strict' | 'none' {
  const v = process.env.COOKIE_SAME_SITE;
  if (v === 'lax' || v === 'strict' || v === 'none') return v;
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /** Looks up + password-checks a login attempt. Same error for "no such user" and "wrong password" — don't leak which one it was. */
  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Incorrect email or password.');
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Incorrect email or password.');
    }
    return user;
  }

  async login(userId: string, res: Response): Promise<{ accessToken: string; user: StaffMemberDto }> {
    const accessToken = this.jwt.sign(await this.buildAccessTokenPayload(userId));
    await this.issueRefreshToken(userId, res);
    return { accessToken, user: await this.buildProfileDto(userId) };
  }

  async refresh(rawRefreshToken: string | undefined, res: Response): Promise<{ accessToken: string; user: StaffMemberDto }> {
    if (!rawRefreshToken) throw new UnauthorizedException('No refresh token provided.');

    const tokenHash = hashToken(rawRefreshToken, this.config.getOrThrow('JWT_REFRESH_SECRET'));
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh session expired — please log in again.');
    }

    // Rotation: this token is single-use. Revoking it here means a stolen
    // cookie that gets replayed after the legitimate client already rotated
    // it will fail — a signal you'd act on in a real deployment (revoke all
    // sessions for that user), though that response isn't built yet.
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account is no longer active.');

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    await this.issueRefreshToken(user.id, res);
    return { accessToken, user: await this.buildProfileDto(user.id) };
  }

  async logout(rawRefreshToken: string | undefined, res: Response): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken, this.config.getOrThrow('JWT_REFRESH_SECRET'));
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: cookiePath() });
  }

  async me(userId: string): Promise<StaffMemberDto> {
    return this.buildProfileDto(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect.');
    assertPasswordAllowed(newPassword, { email: user.email, sameAsCurrent: await bcrypt.compare(newPassword, user.passwordHash) });

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    // Sign out every other session that was using the old password.
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  // ---------------------------------------------------------------------

  private async buildAccessTokenPayload(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { sub: user.id, email: user.email, role: user.role };
  }

  private buildProfileDto(userId: string): Promise<StaffMemberDto> {
    return buildStaffMemberDto(this.prisma, userId);
  }

  private async issueRefreshToken(userId: string, res: Response) {
    const raw = generateOpaqueToken();
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const ttlMs = parseDurationMs(this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(raw, secret), expiresAt },
    });

    res.cookie(REFRESH_COOKIE_NAME, raw, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      // Hosted frontend and API live on different sites, so the cookie must be
      // allowed cross-site there; 'lax' is enough (and safer) in local dev.
      sameSite: cookieSameSite(),
      path: cookiePath(), // only sent back to the refresh/logout routes, not every request
      expires: expiresAt,
    });
  }
}
