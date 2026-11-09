import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from './permissions';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Require the authenticated user to hold at least one of the specified permissions.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      throw new ForbiddenException('Access denied: authentication required');
    }

    const allowed = requiredPermissions.some((perm) => hasPermission(user, perm));
    if (!allowed) {
      throw new ForbiddenException(
        `Access denied: requires permission [${requiredPermissions.join(' or ')}]`,
      );
    }

    return true;
  }
}

