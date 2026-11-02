import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** e.g. @Roles('admin') or @Roles('manager', 'admin') on a controller method. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
