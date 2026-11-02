import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Every route is auth-protected by default (JwtAuthGuard is registered
 * globally — see app.module.ts). Mark the few routes that must work without
 * a token (login, refresh) with @Public() to opt out explicitly, rather than
 * the other way around — safer default for a system with real RBAC.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
