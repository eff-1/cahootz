import { randomInt } from 'node:crypto';
import {
  BRAND_NAME,
  INSTITUTION_EMAIL_OTP,
  MAX_COURSES_PER_TERM,
  MAX_INTERESTS,
  VERIFICATION_STATUS,
  VISIBILITY,
  uuidv7,
  type VerificationStatus,
  type Visibility,
} from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { STAFF_ROLES } from '../../common/policy/policy.ts';
import { type IdentityService } from '../identity/identity.service.ts';
import { type InstitutionsService } from '../institutions/institutions.service.ts';
import { type EmailProvider } from '../notifications/email.provider.ts';

export interface StudentProfileRecord {
  userId: string;
  institutionId: string;
  orgUnitId: string | null;
  programmeId: string | null;
  levelId: string | null;
  displayName: string;
  bio: string | null;
  studyGoals: string[];
  preferredModes: string[];
  availabilityJson: Record<string, string[]>; // e.g., { MON: ['18:00-20:00'], WED: ['16:00-18:00'] }
  visibility: Visibility;
  isDiscoverable: boolean;
  verificationStatus: VerificationStatus;
  institutionalEmail: string | null;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentCourseEnrolmentRecord {
  id: string;
  userId: string;
  courseId: string;
  termId: string;
  createdAt: Date;
}

export interface UserBlockRecord {
  blockerId: string;
  blockedId: string;
  reason: string | null;
  createdAt: Date;
}

interface PendingEmailOtp {
  userId: string;
  institutionId: string;
  institutionalEmail: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

export interface CompleteOnboardingInput {
  institutionId: string;
  orgUnitId?: string;
  programmeId?: string;
  levelId?: string;
  termId?: string;
  courseIds: string[];
  displayName: string;
  bio?: string;
  studyGoals?: string[];
  preferredModes?: string[];
  availabilityJson?: Record<string, string[]>;
  visibility?: Visibility;
  isDiscoverable?: boolean;
}

export interface UpdateProfileInput {
  orgUnitId?: string | null;
  programmeId?: string | null;
  levelId?: string | null;
  displayName?: string;
  bio?: string | null;
  studyGoals?: string[];
  preferredModes?: string[];
  availabilityJson?: Record<string, string[]>;
  visibility?: Visibility;
  isDiscoverable?: boolean;
}

export interface PublicStudentProfileView {
  userId: string;
  institutionId: string;
  displayName: string;
  verificationStatus: VerificationStatus;
  orgUnitId: string | null;
  programmeId: string | null;
  levelId: string | null;
  bio: string | null;
  studyGoals: string[];
  preferredModes: string[];
  availabilityJson: Record<string, string[]>;
  courseIds: string[];
  isMinorRestricted: boolean;
}

export class StudentsService {
  private readonly profiles = new Map<string, StudentProfileRecord>();
  private readonly enrolments = new Map<string, StudentCourseEnrolmentRecord>();
  private readonly blocks = new Map<string, UserBlockRecord>(); // key: `${blockerId}:${blockedId}`
  private readonly pendingOtps = new Map<string, PendingEmailOtp>(); // key: userId

  private readonly identityService: IdentityService;
  private readonly institutionsService: InstitutionsService;
  private readonly emailProvider: EmailProvider;
  private readonly eventBus: DomainEventBus;

  constructor(
    identityService: IdentityService,
    institutionsService: InstitutionsService,
    emailProvider: EmailProvider,
    eventBus: DomainEventBus
  ) {
    this.identityService = identityService;
    this.institutionsService = institutionsService;
    this.emailProvider = emailProvider;
    this.eventBus = eventBus;
  }

  /**
   * Completes or updates student academic onboarding (M2).
   * Note per Charter & Approval Rule: Self-declared academic profile is immediately valid
   * for core studying (`UNVERIFIED`), never blocked by institutional email verification.
   */
  async completeOnboarding(
    userId: string,
    input: CompleteOnboardingInput
  ): Promise<{ profile: StudentProfileRecord; enrolledCourseIds: string[] }> {
    const userInfo = this.identityService.getPublicInfo(userId);
    if (!userInfo) {
      throw AppError.notFound('User not found.');
    }

    this.institutionsService.getInstitution(input.institutionId);

    if (input.orgUnitId) {
      const orgUnit = this.institutionsService.getOrgUnit(input.orgUnitId);
      if (!orgUnit || orgUnit.institutionId !== input.institutionId) {
        throw AppError.validationFailed(
          'Selected organisational unit does not belong to the selected institution.'
        );
      }
    }

    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 80) {
      throw AppError.validationFailed('Display name must be between 2 and 80 characters.');
    }

    const studyGoals = (input.studyGoals ?? []).map((g) => g.trim()).filter(Boolean);
    if (studyGoals.length > MAX_INTERESTS) {
      throw AppError.validationFailed(
        `You may select at most ${MAX_INTERESTS} study goals/interests.`
      );
    }

    const uniqueCourseIds = Array.from(new Set(input.courseIds));
    if (uniqueCourseIds.length > MAX_COURSES_PER_TERM) {
      throw AppError.validationFailed(
        `You may enrol in at most ${MAX_COURSES_PER_TERM} courses per term.`
      );
    }

    // Validate all courses belong to the student's institution
    for (const courseId of uniqueCourseIds) {
      const course = this.institutionsService.getCourse(courseId);
      if (!course || course.institutionId !== input.institutionId) {
        throw AppError.validationFailed(
          `Course ${courseId} does not belong to your institution.`
        );
      }
    }

    // Resolve active term if termId not explicitly passed
    let termId = input.termId;
    if (!termId) {
      const currentTerm = this.institutionsService.currentTerm(input.institutionId);
      if (currentTerm) {
        termId = currentTerm.id;
      }
    }

    if (uniqueCourseIds.length > 0 && !termId) {
      throw AppError.validationFailed(
        'An active academic term is required to enrol in courses.'
      );
    }

    // Enforce under-18 restricted mode defaults (Chapter 12 & Rule 22)
    const defaultVisibility: Visibility = userInfo.isRestricted
      ? VISIBILITY.INSTITUTION
      : input.visibility ?? VISIBILITY.INSTITUTION;
    if (userInfo.isRestricted && input.visibility === VISIBILITY.PUBLIC) {
      throw AppError.forbidden(
        'Under-18 accounts cannot set profile visibility to PUBLIC.'
      );
    }

    const now = new Date();
    const existing = this.profiles.get(userId);

    const profile: StudentProfileRecord = {
      userId,
      institutionId: input.institutionId,
      orgUnitId: input.orgUnitId ?? null,
      programmeId: input.programmeId ?? null,
      levelId: input.levelId ?? null,
      displayName,
      bio: input.bio?.trim() ?? null,
      studyGoals,
      preferredModes: input.preferredModes ?? ['POMODORO_25_5'],
      availabilityJson: input.availabilityJson ?? {},
      visibility: defaultVisibility,
      isDiscoverable: userInfo.isRestricted ? false : (input.isDiscoverable ?? true),
      verificationStatus: existing?.verificationStatus ?? VERIFICATION_STATUS.UNVERIFIED,
      institutionalEmail: existing?.institutionalEmail ?? null,
      onboardingCompletedAt: existing?.onboardingCompletedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.profiles.set(userId, profile);

    // Replace enrolments for the term if termId is present
    if (termId) {
      for (const [key, env] of this.enrolments.entries()) {
        if (env.userId === userId && env.termId === termId) {
          this.enrolments.delete(key);
        }
      }
      for (const courseId of uniqueCourseIds) {
        const id = uuidv7();
        this.enrolments.set(id, {
          id,
          userId,
          courseId,
          termId,
          createdAt: now,
        });
      }
    }

    await this.eventBus.publish('student.onboarded', {
      userId,
      institutionId: profile.institutionId,
      courseCount: uniqueCourseIds.length,
    });

    if (termId && uniqueCourseIds.length > 0) {
      await this.eventBus.publish('student.enrolled', {
        userId,
        institutionId: profile.institutionId,
        termId,
        courseIds: uniqueCourseIds,
      });
    }

    return {
      profile,
      enrolledCourseIds: uniqueCourseIds,
    };
  }

  /**
   * Requests an OTP to verify an institutional email domain (e.g. `@sample.edu.ng`).
   * Does not block studying if skipped or unverified.
   */
  async requestEmailDomainVerification(
    userId: string,
    institutionalEmailRaw: string
  ): Promise<{ expiresAt: Date; domainVerifiedMatch: boolean }> {
    const profile = this.getOwnProfile(userId);
    const institution = this.institutionsService.getInstitution(profile.institutionId);

    const institutionalEmail = institutionalEmailRaw.trim().toLowerCase();
    const parts = institutionalEmail.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw AppError.validationFailed('Invalid email format.');
    }

    if (!this.institutionsService.emailMatchesInstitution(institutionalEmail, profile.institutionId)) {
      throw AppError.validationFailed(
        `Email domain does not match ${institution.name}'s official domains (${institution.emailDomains.join(', ')}).`
      );
    }

    const existingOtp = this.pendingOtps.get(userId);
    const now = new Date();
    if (
      existingOtp &&
      now.getTime() - existingOtp.lastSentAt.getTime() < INSTITUTION_EMAIL_OTP.RESEND_COOLDOWN_SECONDS * 1000
    ) {
      throw AppError.rateLimited('Please wait before requesting another verification code.');
    }

    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(now.getTime() + INSTITUTION_EMAIL_OTP.TTL_MINUTES * 60 * 1000);

    this.pendingOtps.set(userId, {
      userId,
      institutionId: profile.institutionId,
      institutionalEmail,
      code,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    });

    profile.verificationStatus = VERIFICATION_STATUS.PENDING;
    profile.updatedAt = now;

    await this.emailProvider.send({
      to: institutionalEmail,
      subject: `${BRAND_NAME} — Institutional Email Verification Code`,
      text: `Your ${BRAND_NAME} institutional verification code for ${institution.name} is: ${code}. It expires in ${INSTITUTION_EMAIL_OTP.TTL_MINUTES} minutes.`,
    });

    return {
      expiresAt,
      domainVerifiedMatch: true,
    };
  }

  /**
   * Confirms the 6-digit OTP sent to the student's institutional email address.
   */
  async confirmEmailDomainVerification(
    userId: string,
    codeRaw: string
  ): Promise<StudentProfileRecord> {
    const profile = this.getOwnProfile(userId);
    const pending = this.pendingOtps.get(userId);

    if (!pending) {
      throw AppError.validationFailed('No pending institutional email verification found.');
    }

    const now = new Date();
    if (now > pending.expiresAt) {
      this.pendingOtps.delete(userId);
      profile.verificationStatus = VERIFICATION_STATUS.UNVERIFIED;
      throw AppError.validationFailed('Verification code has expired. Please request a new one.');
    }

    pending.attempts += 1;
    if (pending.attempts > INSTITUTION_EMAIL_OTP.MAX_ATTEMPTS) {
      this.pendingOtps.delete(userId);
      profile.verificationStatus = VERIFICATION_STATUS.UNVERIFIED;
      throw AppError.rateLimited('Maximum verification attempts exceeded. Please request a new code.');
    }

    if (pending.code !== codeRaw.trim()) {
      throw AppError.validationFailed('Invalid verification code.');
    }

    this.pendingOtps.delete(userId);
    profile.verificationStatus = VERIFICATION_STATUS.VERIFIED;
    profile.institutionalEmail = pending.institutionalEmail;
    profile.updatedAt = now;

    await this.eventBus.publish('student.verified_email_domain', {
      userId,
      institutionId: profile.institutionId,
      institutionalEmail: pending.institutionalEmail,
    });

    return profile;
  }

  /**
   * Helper for tests/dev to inspect pending OTP code without reading raw email text.
   */
  getPendingOtpCodeForTest(userId: string): string | undefined {
    return this.pendingOtps.get(userId)?.code;
  }

  getOwnProfile(userId: string): StudentProfileRecord {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw AppError.notFound('Student profile not found. Please complete onboarding first.');
    }
    return profile;
  }

  findProfile(userId: string): StudentProfileRecord | null {
    return this.profiles.get(userId) ?? null;
  }

  getEnrolledCourseIds(userId: string, termId?: string): string[] {
    const results: string[] = [];
    for (const env of this.enrolments.values()) {
      if (env.userId === userId && (!termId || env.termId === termId)) {
        results.push(env.courseId);
      }
    }
    return results;
  }

  updateProfile(userId: string, input: UpdateProfileInput): StudentProfileRecord {
    const profile = this.getOwnProfile(userId);
    const userInfo = this.identityService.getPublicInfo(userId);

    if (input.orgUnitId !== undefined && input.orgUnitId !== null) {
      const orgUnit = this.institutionsService.getOrgUnit(input.orgUnitId);
      if (!orgUnit || orgUnit.institutionId !== profile.institutionId) {
        throw AppError.validationFailed(
          'Organisational unit does not belong to your institution.'
        );
      }
      profile.orgUnitId = input.orgUnitId;
    } else if (input.orgUnitId === null) {
      profile.orgUnitId = null;
    }

    if (input.programmeId !== undefined) profile.programmeId = input.programmeId;
    if (input.levelId !== undefined) profile.levelId = input.levelId;

    if (input.displayName !== undefined) {
      const trimmed = input.displayName.trim();
      if (trimmed.length < 2 || trimmed.length > 80) {
        throw AppError.validationFailed('Display name must be between 2 and 80 characters.');
      }
      profile.displayName = trimmed;
    }

    if (input.bio !== undefined) {
      profile.bio = input.bio ? input.bio.trim() : null;
    }

    if (input.studyGoals !== undefined) {
      if (input.studyGoals.length > MAX_INTERESTS) {
        throw AppError.validationFailed(
          `You may select at most ${MAX_INTERESTS} study goals/interests.`
        );
      }
      profile.studyGoals = input.studyGoals;
    }

    if (input.preferredModes !== undefined) {
      profile.preferredModes = input.preferredModes;
    }

    if (input.availabilityJson !== undefined) {
      profile.availabilityJson = input.availabilityJson;
    }

    if (input.visibility !== undefined) {
      if (userInfo?.isRestricted && input.visibility === VISIBILITY.PUBLIC) {
        throw AppError.forbidden(
          'Under-18 accounts cannot set profile visibility to PUBLIC.'
        );
      }
      profile.visibility = input.visibility;
    }

    if (input.isDiscoverable !== undefined) {
      profile.isDiscoverable = input.isDiscoverable;
    }

    profile.updatedAt = new Date();
    return profile;
  }

  /**
   * Enrols or updates courses for a specific term.
   */
  async updateCourseEnrolments(
    userId: string,
    termId: string,
    courseIds: string[]
  ): Promise<string[]> {
    const profile = this.getOwnProfile(userId);
    const uniqueCourseIds = Array.from(new Set(courseIds));

    if (uniqueCourseIds.length > MAX_COURSES_PER_TERM) {
      throw AppError.validationFailed(
        `You may enrol in at most ${MAX_COURSES_PER_TERM} courses per term.`
      );
    }

    for (const courseId of uniqueCourseIds) {
      const course = this.institutionsService.getCourse(courseId);
      if (!course || course.institutionId !== profile.institutionId) {
        throw AppError.validationFailed(
          `Course ${courseId} does not belong to your institution.`
        );
      }
    }

    for (const [key, env] of this.enrolments.entries()) {
      if (env.userId === userId && env.termId === termId) {
        this.enrolments.delete(key);
      }
    }

    const now = new Date();
    for (const courseId of uniqueCourseIds) {
      const id = uuidv7();
      this.enrolments.set(id, {
        id,
        userId,
        courseId,
        termId,
        createdAt: now,
      });
    }

    await this.eventBus.publish('student.enrolled', {
      userId,
      institutionId: profile.institutionId,
      termId,
      courseIds: uniqueCourseIds,
    });

    return uniqueCourseIds;
  }

  /**
   * Returns another student's profile subject to:
   * 1. Symmetric block check (neither viewer nor target blocked the other)
   * 2. Institution boundary + visibility check (`PRIVATE`, `INSTITUTION`, `PUBLIC`)
   * 3. Under-18 minor protection rules
   */
  getProfileForViewer(viewerUserId: string, targetUserId: string): PublicStudentProfileView {
    const viewerInfo = this.identityService.getPublicInfo(viewerUserId);
    if (!viewerInfo) {
      throw AppError.unauthenticated();
    }

    const targetProfile = this.profiles.get(targetUserId);
    const targetInfo = this.identityService.getPublicInfo(targetUserId);
    if (!targetProfile || !targetInfo) {
      throw AppError.notFound('Student profile not found.');
    }

    if (this.isBlockedBetween(viewerUserId, targetUserId)) {
      throw AppError.notFound('Student profile not found.');
    }

    const isSelf = viewerUserId === targetUserId;
    const isStaff = viewerInfo.roles.some((r) =>
      (STAFF_ROLES as readonly string[]).includes(r)
    );

    if (!isSelf && !isStaff) {
      if (targetProfile.visibility === VISIBILITY.PRIVATE) {
        throw AppError.forbidden('This student profile is private.');
      }

      const viewerProfile = this.profiles.get(viewerUserId);
      if (
        targetProfile.visibility === VISIBILITY.INSTITUTION ||
        targetInfo.isRestricted
      ) {
        if (!viewerProfile || viewerProfile.institutionId !== targetProfile.institutionId) {
          throw AppError.forbidden(
            'Cross-institution access to this profile is not permitted.'
          );
        }
      }
    }

    return {
      userId: targetProfile.userId,
      institutionId: targetProfile.institutionId,
      displayName: targetProfile.displayName,
      verificationStatus: targetProfile.verificationStatus,
      orgUnitId: targetProfile.orgUnitId,
      programmeId: targetProfile.programmeId,
      levelId: targetProfile.levelId,
      bio: targetProfile.bio,
      studyGoals: targetProfile.studyGoals,
      preferredModes: targetProfile.preferredModes,
      availabilityJson: targetProfile.availabilityJson,
      courseIds: this.getEnrolledCourseIds(targetUserId),
      isMinorRestricted: targetInfo.isRestricted,
    };
  }

  /**
   * Lists all profiles within an institution (used by Discovery module through public interface).
   */
  listInstitutionProfiles(institutionId: string): StudentProfileRecord[] {
    return Array.from(this.profiles.values()).filter(
      (p) => p.institutionId === institutionId
    );
  }

  // ============================================================================
  // USER BLOCKING (Symmetric enforcement in discovery, invitations, sessions, DMs)
  // ============================================================================

  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<UserBlockRecord> {
    if (blockerId === blockedId) {
      throw AppError.validationFailed('You cannot block yourself.');
    }

    const key = `${blockerId}:${blockedId}`;
    const existing = this.blocks.get(key);
    if (existing) {
      return existing;
    }

    const record: UserBlockRecord = {
      blockerId,
      blockedId,
      reason: reason?.trim() ?? null,
      createdAt: new Date(),
    };
    this.blocks.set(key, record);

    await this.eventBus.publish('user.blocked', {
      blockerId,
      blockedId,
    });

    return record;
  }

  unblockUser(blockerId: string, blockedId: string): { unblocked: boolean } {
    const key = `${blockerId}:${blockedId}`;
    const deleted = this.blocks.delete(key);
    return { unblocked: deleted };
  }

  /**
   * Returns true if `userA` has blocked `userB` OR `userB` has blocked `userA`.
   */
  isBlockedBetween(userA: string, userB: string): boolean {
    return (
      this.blocks.has(`${userA}:${userB}`) ||
      this.blocks.has(`${userB}:${userA}`)
    );
  }

  listBlockedUsers(blockerId: string): UserBlockRecord[] {
    return Array.from(this.blocks.values()).filter((b) => b.blockerId === blockerId);
  }

  listAllProfilesForPersistence(): StudentProfileRecord[] {
    return Array.from(this.profiles.values());
  }

  listAllEnrolmentsForPersistence(): StudentCourseEnrolmentRecord[] {
    return Array.from(this.enrolments.values());
  }

  hydrateFromSql(
    profiles: StudentProfileRecord[],
    enrolments: StudentCourseEnrolmentRecord[]
  ): void {
    for (const p of profiles) {
      this.profiles.set(p.userId, p);
    }
    for (const e of enrolments) {
      this.enrolments.set(e.id, e);
    }
  }
}
