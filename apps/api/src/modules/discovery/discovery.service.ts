import {
  RATE_LIMITS,
  RELIABILITY_BANDS,
  uuidv7,
  type ReliabilityBand,
} from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type InstitutionsService } from '../institutions/institutions.service.ts';
import { type StudentsService } from '../students/students.service.ts';

export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export interface StudyNowSignal {
  userId: string;
  institutionId: string;
  courseId: string | null;
  goalNote: string | null;
  durationMinutes: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface StudyInvitationEntity {
  id: string;
  institutionId: string;
  senderId: string;
  recipientId: string;
  courseId: string;
  goal: string;
  proposedStartAt: Date;
  durationMinutes: number;
  mode: string;
  status: InvitationStatus;
  idempotencyKey: string | null;
  respondedAt: Date | null;
  sessionId: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface DiscoveryQuery {
  courseId?: string;
  levelId?: string;
  studyGoal?: string;
  studyNowOnly?: boolean;
  limit?: number;
}

export interface DiscoveryCandidate {
  userId: string;
  displayName: string;
  verificationStatus: string;
  levelId: string | null;
  orgUnitId: string | null;
  programmeId: string | null;
  sharedCourseIds: string[];
  sharedGoals: string[];
  overlappingAvailabilitySlots: number;
  reliabilityBand: ReliabilityBand;
  studyNow: StudyNowSignal | null;
  matchScore: number;
  matchReasons: string[];
}

export interface ReliabilityProvider {
  getReliabilityBand(userId: string): ReliabilityBand;
}

const STUDY_NOW_TTL_MS = 30 * 60 * 1000; // 30 minutes auto-expiry
const DECLINE_THRESHOLD_FOR_COOLDOWN = 2; // 2 declines from same recipient triggers 24h cooldown

export class DiscoveryService {
  private readonly studyNowSignals = new Map<string, StudyNowSignal>(); // userId -> signal
  private readonly invitations = new Map<string, StudyInvitationEntity>(); // id -> invitation
  private readonly invitationsByIdempotency = new Map<string, string>(); // `${senderId}:${key}` -> invitationId
  private readonly declineHistory = new Map<string, Date[]>(); // `${senderId}:${recipientId}` -> timestamps of declines

  private readonly studentsService: StudentsService;
  private readonly institutionsService: InstitutionsService;
  private readonly eventBus: DomainEventBus;
  private reliabilityProvider: ReliabilityProvider | null = null;

  constructor(
    studentsService: StudentsService,
    institutionsService: InstitutionsService,
    eventBus: DomainEventBus,
    reliabilityProvider?: ReliabilityProvider
  ) {
    this.studentsService = studentsService;
    this.institutionsService = institutionsService;
    this.eventBus = eventBus;
    this.reliabilityProvider = reliabilityProvider ?? null;
  }

  setReliabilityProvider(provider: ReliabilityProvider): void {
    this.reliabilityProvider = provider;
  }

  // ─── "Looking to Study Now" Signal (30-min auto-expiry) ──────────

  setStudyNowSignal(
    userId: string,
    input: { courseId?: string; goalNote?: string; durationMinutes?: number },
    now: Date = new Date()
  ): StudyNowSignal {
    const profile = this.studentsService.getOwnProfile(userId);
    if (!profile.isDiscoverable) {
      throw AppError.validationFailed(
        'Cannot broadcast a "Study Now" signal while your profile is hidden from discovery.'
      );
    }

    if (input.courseId) {
      const course = this.institutionsService.getCourse(input.courseId);
      if (!course || course.institutionId !== profile.institutionId) {
        throw AppError.validationFailed('Course does not belong to your institution.');
      }
    }

    const durationMinutes = input.durationMinutes ?? 50;
    if (durationMinutes < 15 || durationMinutes > 240) {
      throw AppError.validationFailed('Duration must be between 15 and 240 minutes.');
    }

    const signal: StudyNowSignal = {
      userId,
      institutionId: profile.institutionId,
      courseId: input.courseId ?? null,
      goalNote: input.goalNote?.trim() ?? null,
      durationMinutes,
      createdAt: now,
      expiresAt: new Date(now.getTime() + STUDY_NOW_TTL_MS),
    };

    this.studyNowSignals.set(userId, signal);
    return signal;
  }

  clearStudyNowSignal(userId: string): { cleared: boolean } {
    return { cleared: this.studyNowSignals.delete(userId) };
  }

  getActiveStudyNowSignal(userId: string, now: Date = new Date()): StudyNowSignal | null {
    const signal = this.studyNowSignals.get(userId);
    if (!signal) return null;
    if (signal.expiresAt <= now) {
      this.studyNowSignals.delete(userId);
      return null;
    }
    return signal;
  }

  // ─── Partner Discovery (Strict Institution Boundary + Transparent Scoring) ───

  discoverPartners(
    viewerUserId: string,
    query: DiscoveryQuery = {},
    now: Date = new Date()
  ): DiscoveryCandidate[] {
    const viewerProfile = this.studentsService.getOwnProfile(viewerUserId);
    const viewerCourses = new Set(this.studentsService.getEnrolledCourseIds(viewerUserId));
    const viewerGoals = new Set(viewerProfile.studyGoals.map((g) => g.toLowerCase()));

    // Mandatory institution boundary: only inspect profiles from viewer's institution
    const institutionProfiles = this.studentsService.listInstitutionProfiles(
      viewerProfile.institutionId
    );

    const candidates: DiscoveryCandidate[] = [];

    for (const candidate of institutionProfiles) {
      // 1. Never include self
      if (candidate.userId === viewerUserId) continue;

      // 2. Never include hidden profiles (`isDiscoverable: false` or `PRIVATE` visibility)
      if (!candidate.isDiscoverable || candidate.visibility === 'PRIVATE') continue;

      // 3. Never include blocked users in either direction
      if (this.studentsService.isBlockedBetween(viewerUserId, candidate.userId)) continue;

      const candidateCourses = this.studentsService.getEnrolledCourseIds(candidate.userId);
      const activeSignal = this.getActiveStudyNowSignal(candidate.userId, now);

      // Apply optional query filters
      if (query.courseId && !candidateCourses.includes(query.courseId)) {
        continue;
      }
      if (query.levelId && candidate.levelId !== query.levelId) {
        continue;
      }
      if (
        query.studyGoal &&
        !candidate.studyGoals.some((g) => g.toLowerCase() === query.studyGoal!.toLowerCase())
      ) {
        continue;
      }
      if (query.studyNowOnly && !activeSignal) {
        continue;
      }

      // Compute transparent match score & reasons
      const sharedCourseIds = candidateCourses.filter((c) => viewerCourses.has(c));
      const sharedGoals = candidate.studyGoals.filter((g) =>
        viewerGoals.has(g.toLowerCase())
      );
      const overlappingAvailabilitySlots = this.countOverlappingSlots(
        viewerProfile.availabilityJson,
        candidate.availabilityJson
      );
      const reliabilityBand =
        this.reliabilityProvider?.getReliabilityBand(candidate.userId) ??
        RELIABILITY_BANDS.NEW;

      let matchScore = 0;
      const matchReasons: string[] = [];

      // Course overlap weight (highest priority: 40 pts for first shared course, +15 per additional)
      if (sharedCourseIds.length > 0) {
        matchScore += 40 + (sharedCourseIds.length - 1) * 15;
        matchReasons.push(`${sharedCourseIds.length} shared course(s)`);
      }

      // Active "Looking to study now" signal (+30 pts)
      if (activeSignal) {
        matchScore += 30;
        matchReasons.push('Looking to study right now');
      }

      // Same academic level (+10 pts)
      if (viewerProfile.levelId && candidate.levelId === viewerProfile.levelId) {
        matchScore += 10;
        matchReasons.push('Same academic level');
      }

      // Availability overlap (+8 pts per slot, capped at 24)
      if (overlappingAvailabilitySlots > 0) {
        matchScore += Math.min(24, overlappingAvailabilitySlots * 8);
        matchReasons.push(`${overlappingAvailabilitySlots} overlapping availability slot(s)`);
      }

      // Shared study goals (+5 pts each)
      if (sharedGoals.length > 0) {
        matchScore += sharedGoals.length * 5;
        matchReasons.push(`Shared goal: ${sharedGoals.join(', ')}`);
      }

      // Reliability band bonus (transparent reward for consistent completion)
      if (reliabilityBand === RELIABILITY_BANDS.VERY_RELIABLE) {
        matchScore += 12;
      } else if (reliabilityBand === RELIABILITY_BANDS.RELIABLE) {
        matchScore += 8;
      } else if (reliabilityBand === RELIABILITY_BANDS.BUILDING) {
        matchScore += 3;
      }

      candidates.push({
        userId: candidate.userId,
        displayName: candidate.displayName,
        verificationStatus: candidate.verificationStatus,
        levelId: candidate.levelId,
        orgUnitId: candidate.orgUnitId,
        programmeId: candidate.programmeId,
        sharedCourseIds,
        sharedGoals,
        overlappingAvailabilitySlots,
        reliabilityBand,
        studyNow: activeSignal,
        matchScore,
        matchReasons,
      });
    }

    candidates.sort((a, b) => b.matchScore - a.matchScore);
    const limit = Math.min(query.limit ?? 25, 100);
    return candidates.slice(0, limit);
  }

  private countOverlappingSlots(
    a: Record<string, string[]>,
    b: Record<string, string[]>
  ): number {
    let count = 0;
    for (const [day, slotsA] of Object.entries(a)) {
      const slotsB = b[day];
      if (!slotsB) continue;
      const setB = new Set(slotsB);
      for (const slot of slotsA) {
        if (setB.has(slot)) count += 1;
      }
    }
    return count;
  }

  // ─── Study Invitations (Create, Accept, Decline, Withdraw, Expire) ───

  async sendInvitation(
    senderId: string,
    input: {
      recipientId: string;
      courseId: string;
      goal: string;
      proposedStartAt?: Date;
      durationMinutes?: number;
      mode?: string;
      idempotencyKey?: string;
    },
    now: Date = new Date()
  ): Promise<StudyInvitationEntity> {
    if (senderId === input.recipientId) {
      throw AppError.validationFailed('You cannot send a study invitation to yourself.');
    }

    // 1. Idempotency check
    if (input.idempotencyKey) {
      const idemKey = `${senderId}:${input.idempotencyKey}`;
      const existingId = this.invitationsByIdempotency.get(idemKey);
      if (existingId) {
        return this.invitations.get(existingId)!;
      }
    }

    const senderProfile = this.studentsService.getOwnProfile(senderId);
    const recipientProfile = this.studentsService.findProfile(input.recipientId);

    if (!recipientProfile) {
      throw AppError.notFound('Recipient student profile not found.');
    }

    // 2. Institution boundary check
    if (senderProfile.institutionId !== recipientProfile.institutionId) {
      throw AppError.forbidden('Cross-institution study invitations are not permitted.');
    }

    // 3. Block check (symmetric)
    if (this.studentsService.isBlockedBetween(senderId, input.recipientId)) {
      throw AppError.notFound('Recipient student profile not found.');
    }

    // 4. Validate course belongs to institution
    const course = this.institutionsService.getCourse(input.courseId);
    if (!course || course.institutionId !== senderProfile.institutionId) {
      throw AppError.validationFailed('Course does not belong to your institution.');
    }

    const goal = input.goal.trim();
    if (goal.length < 3 || goal.length > 200) {
      throw AppError.validationFailed('Study goal must be between 3 and 200 characters.');
    }

    const durationMinutes = input.durationMinutes ?? 50;
    if (durationMinutes < 15 || durationMinutes > 240) {
      throw AppError.validationFailed('Session duration must be between 15 and 240 minutes.');
    }

    // 5. Check 24h cooldown after repeated declines from same recipient
    const declineKey = `${senderId}:${input.recipientId}`;
    const cooldownWindowMs = RATE_LIMITS.DECLINE_COOLDOWN_HOURS * 60 * 60 * 1000;
    const recentDeclines = (this.declineHistory.get(declineKey) ?? []).filter(
      (ts) => now.getTime() - ts.getTime() < cooldownWindowMs
    );
    if (recentDeclines.length >= DECLINE_THRESHOLD_FOR_COOLDOWN) {
      throw AppError.rateLimited(
        `You cannot send another invitation to this student within ${RATE_LIMITS.DECLINE_COOLDOWN_HOURS} hours after repeated declines.`
      );
    }

    // 6. Enforce daily invitation cap (`RATE_LIMITS.INVITATIONS_PER_DAY = 10`)
    const startOfUtcDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    let sentToday = 0;
    for (const inv of this.invitations.values()) {
      if (inv.senderId === senderId && inv.createdAt >= startOfUtcDay) {
        sentToday += 1;
      }
    }
    if (sentToday >= RATE_LIMITS.INVITATIONS_PER_DAY) {
      throw AppError.rateLimited(
        `Daily study invitation limit (${RATE_LIMITS.INVITATIONS_PER_DAY}) reached.`
      );
    }

    const proposedStartAt = input.proposedStartAt ?? new Date(now.getTime() + 5 * 60 * 1000);
    const expiresAt = new Date(
      Math.max(proposedStartAt.getTime() + 30 * 60 * 1000, now.getTime() + 2 * 60 * 60 * 1000)
    );

    const invitation: StudyInvitationEntity = {
      id: uuidv7(),
      institutionId: senderProfile.institutionId,
      senderId,
      recipientId: input.recipientId,
      courseId: input.courseId,
      goal,
      proposedStartAt,
      durationMinutes,
      mode: input.mode ?? 'POMODORO_25_5',
      status: 'PENDING',
      idempotencyKey: input.idempotencyKey ?? null,
      respondedAt: null,
      sessionId: null,
      createdAt: now,
      expiresAt,
    };

    this.invitations.set(invitation.id, invitation);
    if (input.idempotencyKey) {
      this.invitationsByIdempotency.set(`${senderId}:${input.idempotencyKey}`, invitation.id);
    }

    await this.eventBus.publish('invitation.sent', {
      invitationId: invitation.id,
      senderId,
      recipientId: input.recipientId,
      courseId: input.courseId,
    });

    return invitation;
  }

  getInvitationForActor(actorUserId: string, invitationId: string): StudyInvitationEntity {
    const inv = this.invitations.get(invitationId);
    if (!inv) {
      throw AppError.notFound('Invitation not found.');
    }
    if (inv.senderId !== actorUserId && inv.recipientId !== actorUserId) {
      // Return 404 to prevent IDOR enumeration
      throw AppError.notFound('Invitation not found.');
    }
    return inv;
  }

  async acceptInvitation(
    recipientId: string,
    invitationId: string,
    now: Date = new Date()
  ): Promise<StudyInvitationEntity> {
    const inv = this.getInvitationForActor(recipientId, invitationId);
    if (inv.recipientId !== recipientId) {
      throw AppError.forbidden('Only the recipient can accept a study invitation.');
    }
    this.expireIfPast(inv, now);
    if (inv.status !== 'PENDING') {
      throw AppError.invalidState(`Cannot accept an invitation in state ${inv.status}.`);
    }

    if (this.studentsService.isBlockedBetween(inv.senderId, inv.recipientId)) {
      throw AppError.invalidState('Cannot accept invitation due to block.');
    }

    inv.status = 'ACCEPTED';
    inv.respondedAt = now;

    await this.eventBus.publish('invitation.accepted', {
      invitationId: inv.id,
      senderId: inv.senderId,
      recipientId: inv.recipientId,
      courseId: inv.courseId,
      goal: inv.goal,
      durationMinutes: inv.durationMinutes,
      proposedStartAt: inv.proposedStartAt.toISOString(),
    });

    return inv;
  }

  async declineInvitation(
    recipientId: string,
    invitationId: string,
    now: Date = new Date()
  ): Promise<StudyInvitationEntity> {
    const inv = this.getInvitationForActor(recipientId, invitationId);
    if (inv.recipientId !== recipientId) {
      throw AppError.forbidden('Only the recipient can decline a study invitation.');
    }
    this.expireIfPast(inv, now);
    if (inv.status !== 'PENDING') {
      throw AppError.invalidState(`Cannot decline an invitation in state ${inv.status}.`);
    }

    inv.status = 'DECLINED';
    inv.respondedAt = now;

    const declineKey = `${inv.senderId}:${inv.recipientId}`;
    const list = this.declineHistory.get(declineKey) ?? [];
    list.push(now);
    this.declineHistory.set(declineKey, list);

    await this.eventBus.publish('invitation.declined', {
      invitationId: inv.id,
      senderId: inv.senderId,
      recipientId: inv.recipientId,
    });

    return inv;
  }

  async withdrawInvitation(
    senderId: string,
    invitationId: string,
    now: Date = new Date()
  ): Promise<StudyInvitationEntity> {
    const inv = this.getInvitationForActor(senderId, invitationId);
    if (inv.senderId !== senderId) {
      throw AppError.forbidden('Only the sender can withdraw a study invitation.');
    }
    this.expireIfPast(inv, now);
    if (inv.status !== 'PENDING') {
      throw AppError.invalidState(`Cannot withdraw an invitation in state ${inv.status}.`);
    }

    inv.status = 'WITHDRAWN';
    inv.respondedAt = now;

    await this.eventBus.publish('invitation.withdrawn', {
      invitationId: inv.id,
      senderId: inv.senderId,
      recipientId: inv.recipientId,
    });

    return inv;
  }

  attachSessionToInvitation(invitationId: string, sessionId: string): void {
    const inv = this.invitations.get(invitationId);
    if (inv) {
      inv.sessionId = sessionId;
    }
  }

  hasAcceptedInvitationBetween(userA: string, userB: string): boolean {
    for (const inv of this.invitations.values()) {
      if (
        inv.status === 'ACCEPTED' &&
        ((inv.senderId === userA && inv.recipientId === userB) ||
          (inv.senderId === userB && inv.recipientId === userA))
      ) {
        return true;
      }
    }
    return false;
  }

  listInvitationsForUser(
    userId: string,
    direction: 'incoming' | 'outgoing' | 'all' = 'all',
    now: Date = new Date()
  ): StudyInvitationEntity[] {
    const results: StudyInvitationEntity[] = [];
    for (const inv of this.invitations.values()) {
      this.expireIfPast(inv, now);
      if (direction === 'incoming' && inv.recipientId === userId) {
        results.push(inv);
      } else if (direction === 'outgoing' && inv.senderId === userId) {
        results.push(inv);
      } else if (
        direction === 'all' &&
        (inv.senderId === userId || inv.recipientId === userId)
      ) {
        results.push(inv);
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private expireIfPast(inv: StudyInvitationEntity, now: Date): void {
    if (inv.status === 'PENDING' && inv.expiresAt <= now) {
      inv.status = 'EXPIRED';
      inv.respondedAt = now;
      void this.eventBus.publish('invitation.expired', {
        invitationId: inv.id,
        senderId: inv.senderId,
        recipientId: inv.recipientId,
      });
    }
  }
}

