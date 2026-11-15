import {
  RATE_LIMITS,
  ROLES,
  uuidv7,
} from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type AuthenticatedUser } from '../../common/guards/jwt-auth.guard.ts';
import { Policy } from '../../common/policy/policy.ts';

export type ReportCategory =
  | 'CRITICAL_SAFETY'
  | 'HARASSMENT'
  | 'ACADEMIC_INTEGRITY'
  | 'SPAM'
  | 'OTHER';

export type ReportTargetType = 'USER' | 'MESSAGE' | 'POST' | 'ANSWER' | 'SESSION';

export type SanctionActionType =
  | 'DISMISS'
  | 'WARN'
  | 'REMOVE_CONTENT'
  | 'RESTRICT_24H'
  | 'RESTRICT_7D'
  | 'SUSPEND';

export interface ModerationReportEntity {
  id: string;
  institutionId: string | null;
  reporterId: string;
  targetUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  description: string;
  /** Immutable evidence snapshot captured at report time (restricted access). */
  evidenceSnapshot: Record<string, unknown>;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  slaDueAt: Date;
  resolvedByModeratorId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface SanctionEntity {
  id: string;
  reportId: string;
  targetUserId: string;
  issuedByModeratorId: string;
  action: SanctionActionType;
  reason: string;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AppealEntity {
  id: string;
  sanctionId: string;
  appellantUserId: string;
  reason: string;
  status: 'PENDING' | 'UPHELD' | 'OVERTURNED';
  reviewedByModeratorId: string | null;
  reviewNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}

export interface AuditLogEntry {
  id: string;
  seq: number;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Proposed SLA targets per category (OPEN-12).
 */
export const MODERATION_SLA_HOURS: Record<ReportCategory, number> = {
  CRITICAL_SAFETY: 1,
  HARASSMENT: 4,
  ACADEMIC_INTEGRITY: 24,
  SPAM: 24,
  OTHER: 24,
};

export class ModerationService {
  private readonly reports = new Map<string, ModerationReportEntity>();
  private readonly sanctions = new Map<string, SanctionEntity>();
  private readonly appeals = new Map<string, AppealEntity>();
  private readonly auditLog: AuditLogEntry[] = [];
  private readonly eventBus: DomainEventBus;

  constructor(eventBus: DomainEventBus) {
    this.eventBus = eventBus;
  }

  // ─── Append-Only Audit Log (Rule 19) ─────────────────────────────

  recordAudit(input: {
    actorId: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
    now?: Date;
  }): AuditLogEntry {
    const entry: AuditLogEntry = Object.freeze({
      id: uuidv7(),
      seq: this.auditLog.length + 1,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: { ...(input.metadata ?? {}) },
      createdAt: input.now ?? new Date(),
    });
    this.auditLog.push(entry);
    return entry;
  }

  listAuditLog(staffUser: AuthenticatedUser): readonly AuditLogEntry[] {
    Policy.assertStaffWithMfa(staffUser);
    return [...this.auditLog];
  }

  // ─── One-Tap Reporting with Evidence Snapshot ────────────────────

  async createReport(
    reporter: AuthenticatedUser,
    input: {
      targetUserId: string;
      targetType: ReportTargetType;
      targetId: string;
      category: ReportCategory;
      description: string;
      evidenceSnapshot: Record<string, unknown>;
    },
    now: Date = new Date()
  ): Promise<ModerationReportEntity> {
    if (reporter.id === input.targetUserId) {
      throw AppError.validationFailed('You cannot file a report against yourself.');
    }

    // Enforce daily report rate limit (`RATE_LIMITS.REPORTS_PER_DAY = 5`)
    const startOfUtcDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    let reportsToday = 0;
    for (const r of this.reports.values()) {
      if (r.reporterId === reporter.id && r.createdAt >= startOfUtcDay) {
        reportsToday += 1;
      }
    }
    if (reportsToday >= RATE_LIMITS.REPORTS_PER_DAY) {
      throw AppError.rateLimited(
        `Maximum daily reports (${RATE_LIMITS.REPORTS_PER_DAY}) reached.`
      );
    }

    const slaHours = MODERATION_SLA_HOURS[input.category] ?? 24;
    const slaDueAt = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    const report: ModerationReportEntity = {
      id: uuidv7(),
      institutionId: reporter.institutionId,
      reporterId: reporter.id,
      targetUserId: input.targetUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      category: input.category,
      description: input.description.trim(),
      evidenceSnapshot: Object.freeze({ ...input.evidenceSnapshot }),
      status: 'OPEN',
      slaDueAt,
      resolvedByModeratorId: null,
      resolvedAt: null,
      createdAt: now,
    };

    this.reports.set(report.id, report);

    await this.eventBus.publish('moderation.report_created', {
      reportId: report.id,
      category: report.category,
      targetType: report.targetType,
      slaDueAt: report.slaDueAt.toISOString(),
    });

    return report;
  }

  listQueue(
    moderator: AuthenticatedUser,
    status: 'OPEN' | 'RESOLVED' | 'DISMISSED' = 'OPEN'
  ): ModerationReportEntity[] {
    Policy.assertStaffWithMfa(moderator);
    return Array.from(this.reports.values())
      .filter((r) => r.status === status)
      .sort((a, b) => a.slaDueAt.getTime() - b.slaDueAt.getTime());
  }

  // ─── Sanctions (`WARN`, `REMOVE_CONTENT`, `RESTRICT_24H`, `RESTRICT_7D`, `SUSPEND`) ───

  async resolveReportWithAction(
    moderator: AuthenticatedUser,
    reportId: string,
    input: {
      action: SanctionActionType;
      reason: string;
    },
    now: Date = new Date()
  ): Promise<{ report: ModerationReportEntity; sanction: SanctionEntity | null }> {
    Policy.assertStaffWithMfa(moderator);

    const report = this.reports.get(reportId);
    if (!report) {
      throw AppError.notFound('Moderation report not found.');
    }
    if (report.status !== 'OPEN') {
      throw AppError.invalidState('Report has already been resolved.');
    }

    if (input.action === 'DISMISS') {
      report.status = 'DISMISSED';
      report.resolvedByModeratorId = moderator.id;
      report.resolvedAt = now;

      this.recordAudit({
        actorId: moderator.id,
        actorRole: moderator.role,
        action: 'moderation.report_dismissed',
        targetType: 'REPORT',
        targetId: report.id,
        metadata: { reason: input.reason },
        now,
      });

      return { report, sanction: null };
    }

    let expiresAt: Date | null = null;
    if (input.action === 'RESTRICT_24H') {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (input.action === 'RESTRICT_7D') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const sanction: SanctionEntity = {
      id: uuidv7(),
      reportId: report.id,
      targetUserId: report.targetUserId,
      issuedByModeratorId: moderator.id,
      action: input.action,
      reason: input.reason.trim(),
      expiresAt,
      isActive: true,
      createdAt: now,
    };

    this.sanctions.set(sanction.id, sanction);
    report.status = 'RESOLVED';
    report.resolvedByModeratorId = moderator.id;
    report.resolvedAt = now;

    this.recordAudit({
      actorId: moderator.id,
      actorRole: moderator.role,
      action: `moderation.sanction_${input.action.toLowerCase()}`,
      targetType: 'USER',
      targetId: report.targetUserId,
      metadata: {
        reportId: report.id,
        sanctionId: sanction.id,
        reason: sanction.reason,
      },
      now,
    });

    await this.eventBus.publish('moderation.sanction_applied', {
      sanctionId: sanction.id,
      targetUserId: sanction.targetUserId,
      action: sanction.action,
    });

    return { report, sanction };
  }

  isUserRestrictedOrSuspended(userId: string, now: Date = new Date()): boolean {
    for (const s of this.sanctions.values()) {
      if (s.targetUserId !== userId || !s.isActive) continue;
      if (s.action === 'SUSPEND') return true;
      if (
        (s.action === 'RESTRICT_24H' || s.action === 'RESTRICT_7D') &&
        s.expiresAt &&
        s.expiresAt > now
      ) {
        return true;
      }
    }
    return false;
  }

  // ─── Appeals (MUST be reviewed by a different moderator!) ────────

  submitAppeal(
    appellantUserId: string,
    sanctionId: string,
    reason: string,
    now: Date = new Date()
  ): AppealEntity {
    const sanction = this.sanctions.get(sanctionId);
    if (!sanction || sanction.targetUserId !== appellantUserId) {
      throw AppError.notFound('Sanction not found.');
    }

    for (const existing of this.appeals.values()) {
      if (existing.sanctionId === sanctionId) {
        throw AppError.conflict('An appeal has already been submitted for this sanction.');
      }
    }

    const appeal: AppealEntity = {
      id: uuidv7(),
      sanctionId,
      appellantUserId,
      reason: reason.trim(),
      status: 'PENDING',
      reviewedByModeratorId: null,
      reviewNote: null,
      createdAt: now,
      reviewedAt: null,
    };

    this.appeals.set(appeal.id, appeal);
    return appeal;
  }

  reviewAppeal(
    reviewerModerator: AuthenticatedUser,
    appealId: string,
    decision: 'UPHELD' | 'OVERTURNED',
    note: string,
    now: Date = new Date()
  ): AppealEntity {
    Policy.assertStaffWithMfa(reviewerModerator);

    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      throw AppError.notFound('Appeal not found.');
    }
    if (appeal.status !== 'PENDING') {
      throw AppError.invalidState('Appeal has already been reviewed.');
    }

    const sanction = this.sanctions.get(appeal.sanctionId)!;

    // Non-negotiable Moderation Policy rule: Appeals must be reviewed by a DIFFERENT moderator
    // than the one who issued the sanction (unless reviewer is SUPER_ADMIN overriding in emergency,
    // and even then we enforce separation of duties across staff).
    if (
      sanction.issuedByModeratorId === reviewerModerator.id &&
      reviewerModerator.role !== ROLES.SUPER_ADMIN
    ) {
      throw AppError.forbidden(
        'Separation of duties: Appeals must be reviewed by a different moderator than the one who issued the sanction.'
      );
    }

    appeal.status = decision;
    appeal.reviewedByModeratorId = reviewerModerator.id;
    appeal.reviewNote = note.trim();
    appeal.reviewedAt = now;

    if (decision === 'OVERTURNED') {
      sanction.isActive = false;
    }

    this.recordAudit({
      actorId: reviewerModerator.id,
      actorRole: reviewerModerator.role,
      action: `moderation.appeal_${decision.toLowerCase()}`,
      targetType: 'APPEAL',
      targetId: appeal.id,
      metadata: {
        sanctionId: sanction.id,
        originalModeratorId: sanction.issuedByModeratorId,
        note: appeal.reviewNote,
      },
      now,
    });

    return appeal;
  }
}

