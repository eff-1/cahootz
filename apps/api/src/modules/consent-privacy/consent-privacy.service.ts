import { uuidv7 } from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type IdentityService } from '../identity/identity.service.ts';
import { type StudentsService } from '../students/students.service.ts';
import { type WalletService } from '../wallet/wallet.service.ts';

/**
 * Compliance Reference: Nigeria Data Protection Act (NDPA) 2023 & 2025 GAID.
 * NOTE: NEEDS COUNSEL REVIEW (OPEN-06 / OPEN-07).
 */
export const RETENTION_CONFIG = {
  /** Grace period before account deletion request executes irreversible anonymization (days) */
  ACCOUNT_DELETION_GRACE_DAYS: 30,
  /** Session event telemetry retention (days) */
  SESSION_EVENTS_RETENTION_DAYS: 365,
  /** Moderation evidence snapshot retention (days) */
  MODERATION_EVIDENCE_RETENTION_DAYS: 180,
} as const;

export type ConsentPurpose =
  | 'CORE_SERVICE_TERMS'
  | 'PRIVACY_NOTICE_ACK'
  | 'OPTIONAL_PRODUCT_UPDATES'
  | 'PARENTAL_OR_GUARDIAN_CONSENT';

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  policyVersion: string;
  granted: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

export interface DeletionRequestRecord {
  id: string;
  userId: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'PURGED';
  requestedAt: Date;
  scheduledPurgeAt: Date;
  purgedAt: Date | null;
}

export class ConsentPrivacyService {
  private readonly consentLedger: ConsentRecord[] = [];
  private readonly deletionRequests = new Map<string, DeletionRequestRecord>();

  private readonly identityService: IdentityService;
  private readonly studentsService: StudentsService;
  private readonly walletService: WalletService;
  private readonly eventBus: DomainEventBus;

  constructor(
    identityService: IdentityService,
    studentsService: StudentsService,
    walletService: WalletService,
    eventBus: DomainEventBus
  ) {
    this.identityService = identityService;
    this.studentsService = studentsService;
    this.walletService = walletService;
    this.eventBus = eventBus;
  }

  recordConsent(
    userId: string,
    input: {
      purpose: ConsentPurpose;
      policyVersion: string;
      granted: boolean;
      ipAddress?: string;
      userAgent?: string;
    },
    now: Date = new Date()
  ): ConsentRecord {
    const entry: ConsentRecord = Object.freeze({
      id: uuidv7(),
      userId,
      purpose: input.purpose,
      policyVersion: input.policyVersion,
      granted: input.granted,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      timestamp: now,
    });
    this.consentLedger.push(entry);
    return entry;
  }

  listUserConsents(userId: string): ConsentRecord[] {
    return this.consentLedger.filter((c) => c.userId === userId);
  }

  /**
   * NDPA Data Portability / Right of Access: exports all personal data held for the user.
   */
  exportUserData(userId: string, now: Date = new Date()) {
    const account = this.identityService.getPublicInfo(userId);
    if (!account) {
      throw AppError.notFound('User account not found.');
    }

    const profile = this.studentsService.findProfile(userId);
    const enrolledCourseIds = this.studentsService.getEnrolledCourseIds(userId);
    const xpLedger = this.walletService.listXpLedger(userId);
    const streak = this.walletService.getStreak(userId);
    const reliability = this.walletService.getReliability(userId);
    const consents = this.listUserConsents(userId);

    return {
      exportedAt: now.toISOString(),
      complianceNotice: 'Generated under Nigeria Data Protection Act (NDPA) 2023 data subject access right.',
      account,
      academicProfile: profile,
      enrolledCourseIds,
      gamification: {
        totalXp: this.walletService.getXpBalance(userId),
        streak,
        reliability,
        xpLedger,
      },
      consents,
    };
  }

  /**
   * NDPA Right to Erasure: schedules account deletion and revokes active sessions.
   */
  async requestAccountDeletion(
    userId: string,
    now: Date = new Date()
  ): Promise<DeletionRequestRecord> {
    const account = this.identityService.getPublicInfo(userId);
    if (!account) {
      throw AppError.notFound('User not found.');
    }

    await this.identityService.signOutEverywhere(userId);

    const scheduledPurgeAt = new Date(
      now.getTime() + RETENTION_CONFIG.ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000
    );

    const record: DeletionRequestRecord = {
      id: uuidv7(),
      userId,
      status: 'SCHEDULED',
      requestedAt: now,
      scheduledPurgeAt,
      purgedAt: null,
    };

    this.deletionRequests.set(userId, record);
    await this.eventBus.publish('privacy.deletion_requested', {
      userId,
      scheduledPurgeAt: scheduledPurgeAt.toISOString(),
    });

    return record;
  }

  getDeletionRequest(userId: string): DeletionRequestRecord | null {
    return this.deletionRequests.get(userId) ?? null;
  }
}
