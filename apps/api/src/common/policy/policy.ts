import { AppError } from '../errors/app-error.ts';
import {
  ERROR_CODES,
  ROLES,
  type Role,
} from '../../../../../packages/shared/src/index.ts';
import { type AuthenticatedUser } from '../guards/jwt-auth.guard.ts';

/**
 * Central authorization policy layer.
 *
 * Deny by default. Every service method that touches an object owned by someone
 * else asks this layer, instead of scattering ad-hoc checks. Object-level rules
 * (ownership, institution boundary, blocks) are expressed as small pure
 * functions here so they can be unit-tested exhaustively (BOLA/IDOR matrix).
 */
export interface Actor {
  userId: string;
  roles: readonly string[];
  /** Institution the actor belongs to (null until onboarded). */
  institutionId: string | null;
}

export const STAFF_ROLES: readonly Role[] = [
  ROLES.PLATFORM_MODERATOR,
  ROLES.PLATFORM_ADMIN,
  ROLES.SUPER_ADMIN,
];

export function hasAnyRole(actor: Actor, roles: readonly string[]): boolean {
  return actor.roles.some((r) => roles.includes(r));
}

export function requireAnyRole(actor: Actor, roles: readonly string[]): void {
  if (!hasAnyRole(actor, roles)) {
    throw AppError.forbidden('You do not have permission to perform this action');
  }
}

/** Only the owner may act on their own resource. */
export function requireSelf(actor: Actor, ownerId: string): void {
  if (actor.userId !== ownerId) {
    // 404 rather than 403 hides the existence of other users' objects (API spec).
    throw AppError.notFound('Resource not found');
  }
}

export function canReviewAcademicData(actor: Actor): boolean {
  return hasAnyRole(actor, [ROLES.PLATFORM_ADMIN, ROLES.SUPER_ADMIN]);
}

export const Policy = {
  isStaff(user: Pick<AuthenticatedUser, 'role'>): boolean {
    return STAFF_ROLES.includes(user.role);
  },

  assertStaffWithMfa(user: AuthenticatedUser): void {
    if (!Policy.isStaff(user)) {
      throw AppError.forbidden(
        ERROR_CODES.AUTH_FORBIDDEN,
        'Staff privileges are required for this action.'
      );
    }
    if (!user.mfaVerified) {
      throw AppError.forbidden(
        ERROR_CODES.AUTH_MFA_REQUIRED,
        'Multi-factor authentication is required for staff actions.'
      );
    }
  },

  assertSameInstitution(
    user: Pick<AuthenticatedUser, 'institutionId' | 'role'>,
    targetInstitutionId: string
  ): void {
    if (Policy.isStaff(user)) {
      return;
    }
    if (!user.institutionId || user.institutionId !== targetInstitutionId) {
      throw AppError.forbidden(
        ERROR_CODES.INSTITUTION_BOUNDARY_VIOLATION,
        'Cross-institution access is not permitted.'
      );
    }
  },

  assertSelfOrStaff(user: AuthenticatedUser, targetUserId: string): void {
    if (user.id === targetUserId || Policy.isStaff(user)) {
      return;
    }
    throw AppError.forbidden(
      ERROR_CODES.AUTH_FORBIDDEN,
      'You are not authorized to access this resource.'
    );
  },

  assertParticipantOrStaff(
    user: AuthenticatedUser,
    participantIds: readonly string[]
  ): void {
    if (participantIds.includes(user.id) || Policy.isStaff(user)) {
      return;
    }
    throw AppError.forbidden(
      ERROR_CODES.AUTH_FORBIDDEN,
      'Only session participants may access this resource.'
    );
  },
};
