import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@prisma/client';

/** The shape JwtStrategy.validate() returns — attached to req.user by Passport. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

/** Usage: `@CurrentUser() user: AuthenticatedUser` in any guarded controller method. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
