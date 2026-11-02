import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Registered globally alongside JwtAuthGuard. A route with no @Roles()
 * decorator is allowed for any authenticated user — this guard only ever
 * narrows further, never widens, what JwtAuthGuard already permitted.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    return !!user && requiredRoles.includes(user.role);
  }
}
