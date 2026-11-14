import { ERROR_CODES, type Role } from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../errors/app-error.ts';
import { type AuthenticatedUser } from './jwt-auth.guard.ts';

export class RolesGuard {
  assertRoles(user: AuthenticatedUser | undefined, requiredRoles: readonly Role[]): void {
    if (!user) {
      throw AppError.unauthorized();
    }
    if (requiredRoles.length === 0) {
      return;
    }
    if (!requiredRoles.includes(user.role)) {
      throw AppError.forbidden(
        ERROR_CODES.AUTH_FORBIDDEN,
        'You do not have the required role to access this resource.'
      );
    }
  }
}
