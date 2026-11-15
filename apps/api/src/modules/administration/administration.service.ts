import { uuidv7 } from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { type AuthenticatedUser } from '../../common/guards/jwt-auth.guard.ts';
import { Policy } from '../../common/policy/policy.ts';
import { type ModerationService } from '../moderation/moderation.service.ts';

export interface SensitiveActionRequest {
  id: string;
  actionType: 'PURGE_USER' | 'DISABLE_SAFETY_KILLSWITCH' | 'ELEVATE_STAFF_ROLE';
  targetId: string;
  reason: string;
  proposedByStaffId: string;
  approvedByStaffId: string | null;
  status: 'PENDING_SECOND_APPROVAL' | 'EXECUTED' | 'REJECTED';
  createdAt: Date;
  executedAt: Date | null;
}

export class AdministrationService {
  private readonly featureFlags = new Map<string, boolean>([
    ['STUDY_TOGETHER_ENABLED', true],
    ['DISCOVERY_ENABLED', true],
    ['MESSAGING_ENABLED', true],
    ['COMMUNITIES_ENABLED', true],
    ['COURSE_PROPOSALS_ENABLED', true],
  ]);

  private readonly sensitiveActions = new Map<string, SensitiveActionRequest>();
  private readonly moderationService: ModerationService;

  constructor(moderationService: ModerationService) {
    this.moderationService = moderationService;
  }

  isFeatureEnabled(flagKey: string): boolean {
    return this.featureFlags.get(flagKey) ?? false;
  }

  listSensitiveActions(staffUser: AuthenticatedUser): SensitiveActionRequest[] {
    Policy.assertStaffWithMfa(staffUser);
    return Array.from(this.sensitiveActions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  listAllSensitiveActionsForPersistence(): SensitiveActionRequest[] {
    return Array.from(this.sensitiveActions.values());
  }

  hydrateFromSql(actions: SensitiveActionRequest[]): void {
    for (const a of actions) {
      this.sensitiveActions.set(a.id, a);
    }
  }

  setFeatureFlag(
    staffUser: AuthenticatedUser,
    flagKey: string,
    enabled: boolean,
    reason: string
  ): { flagKey: string; enabled: boolean } {
    Policy.assertStaffWithMfa(staffUser);
    this.featureFlags.set(flagKey, enabled);

    this.moderationService.recordAudit({
      actorId: staffUser.id,
      actorRole: staffUser.role,
      action: 'admin.feature_flag_updated',
      targetType: 'FEATURE_FLAG',
      targetId: flagKey,
      metadata: { enabled, reason },
    });

    return { flagKey, enabled };
  }

  /**
   * Two-Approver Rule (SCALABILITY_AND_INFRASTRUCTURE.md & M5):
   * Sensitive actions require two distinct MFA-authenticated staff members.
   */
  proposeSensitiveAction(
    proposer: AuthenticatedUser,
    input: {
      actionType: SensitiveActionRequest['actionType'];
      targetId: string;
      reason: string;
    },
    now: Date = new Date()
  ): SensitiveActionRequest {
    Policy.assertStaffWithMfa(proposer);

    const req: SensitiveActionRequest = {
      id: uuidv7(),
      actionType: input.actionType,
      targetId: input.targetId,
      reason: input.reason.trim(),
      proposedByStaffId: proposer.id,
      approvedByStaffId: null,
      status: 'PENDING_SECOND_APPROVAL',
      createdAt: now,
      executedAt: null,
    };

    this.sensitiveActions.set(req.id, req);

    this.moderationService.recordAudit({
      actorId: proposer.id,
      actorRole: proposer.role,
      action: 'admin.sensitive_action_proposed',
      targetType: input.actionType,
      targetId: input.targetId,
      metadata: { requestId: req.id, reason: req.reason },
      now,
    });

    return req;
  }

  approveSensitiveAction(
    secondApprover: AuthenticatedUser,
    requestId: string,
    now: Date = new Date()
  ): SensitiveActionRequest {
    Policy.assertStaffWithMfa(secondApprover);

    const req = this.sensitiveActions.get(requestId);
    if (!req) {
      throw AppError.notFound('Sensitive action request not found.');
    }
    if (req.status !== 'PENDING_SECOND_APPROVAL') {
      throw AppError.invalidState('Sensitive action request has already been processed.');
    }

    if (req.proposedByStaffId === secondApprover.id) {
      throw AppError.forbidden(
        'Two-approver rule violation: A sensitive action must be approved by a second, distinct staff member.'
      );
    }

    req.approvedByStaffId = secondApprover.id;
    req.status = 'EXECUTED';
    req.executedAt = now;

    this.moderationService.recordAudit({
      actorId: secondApprover.id,
      actorRole: secondApprover.role,
      action: 'admin.sensitive_action_executed',
      targetType: req.actionType,
      targetId: req.targetId,
      metadata: {
        requestId: req.id,
        proposedByStaffId: req.proposedByStaffId,
        approvedByStaffId: secondApprover.id,
      },
      now,
    });

    return req;
  }
}

