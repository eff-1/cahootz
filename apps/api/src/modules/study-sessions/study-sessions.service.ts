import { createHmac } from 'node:crypto';
import {
  COMPLETION,
  DISPUTES,
  EMERGENCY_EXIT,
  PING_OUTCOMES,
  PRESENCE,
  PRESENCE_STATES,
  RATE_LIMITS,
  SESSION_DEFAULTS,
  SESSION_STATES,
  uuidv7,
  type PingOutcome,
  type PresenceState,
  type SessionState,
} from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type Actor, hasAnyRole, STAFF_ROLES } from '../../common/policy/policy.ts';
import { type InstitutionsService } from '../institutions/institutions.service.ts';
import { type StudentsService } from '../students/students.service.ts';
import { type WalletService } from '../wallet/wallet.service.ts';

export interface ParticipantState {
  userId: string;
  checkedInAt: Date | null;
  presenceState: PresenceState;
  lastHeartbeatAt: Date | null;
  lastHeartbeatVisibility: 'VISIBLE' | 'BACKGROUND';
  disconnectedAt: Date | null;
  connectedSeconds: number;
  excusedDisconnectSeconds: number;
  missedConnectedPings: number;
  missedDisconnectedPings: number;
  answeredPings: number;
  completionStatus: 'PENDING' | 'FULL' | 'PARTIAL' | 'INCOMPLETE';
  xpAwarded: number;
  resumeToken: string;
}

export interface SessionEventRecord {
  id: string;
  sessionId: string;
  seq: number;
  actorId: string | null;
  eventType: string;
  fromState: SessionState | null;
  toState: SessionState | null;
  clientEventId: string | null;
  clientSeq: number | null;
  clientTimestamp: Date | null;
  serverTimestamp: Date;
  payload: Record<string, unknown>;
}

export interface RejectedTransitionLog {
  id: string;
  sessionId: string;
  actorId: string;
  attemptedFrom: SessionState;
  attemptedTo: SessionState;
  reason: string;
  timestamp: Date;
}

export interface AccountabilityPingEntity {
  id: string;
  sessionId: string;
  senderId: string;
  recipientId: string;
  idempotencyKey: string | null;
  sentAt: Date;
  expiresAt: Date;
  respondedAt: Date | null;
  outcome: PingOutcome | 'PENDING';
}

export interface SessionDisputeEntity {
  id: string;
  sessionId: string;
  filedByUserId: string;
  reason: string;
  status: 'AUTO_RESOLVED_APPROVED' | 'PENDING_MOD_REVIEW' | 'MOD_APPROVED' | 'MOD_REJECTED';
  resolutionNote: string | null;
  resolvedByUserId: string | null;
  filedAt: Date;
  resolvedAt: Date | null;
}

export interface StudySessionEntity {
  id: string;
  institutionId: string;
  courseId: string;
  hostId: string;
  partnerId: string;
  goal: string;
  mode: string;
  plannedDurationMinutes: number;
  pingResponseWindowSeconds: number;
  state: SessionState;
  version: number; // Optimistic concurrency version, incremented on every transition
  scheduledStartAt: Date;
  startedAt: Date | null;
  pausedAt: Date | null;
  pausedDurationSeconds: number;
  endedAt: Date | null;
  idempotencyKey: string | null;
  participants: Record<string, ParticipantState>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimerSnapshot {
  sessionId: string;
  state: SessionState;
  version: number;
  serverNow: string;
  startedAt: string | null;
  plannedEnd: string | null;
  pausedDurationSeconds: number;
  elapsedActiveSeconds: number;
  remainingSeconds: number;
  clientClockSkewMs: number | null;
}

/**
 * Valid state transitions per FEATURE_SPECIFICATIONS.md Section 7.2.
 */
export const ALLOWED_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  [SESSION_STATES.CREATED]: [
    SESSION_STATES.INVITED,
    SESSION_STATES.SCHEDULED,
    SESSION_STATES.READY,
    SESSION_STATES.CANCELLED,
  ],
  [SESSION_STATES.INVITED]: [
    SESSION_STATES.SCHEDULED,
    SESSION_STATES.READY,
    SESSION_STATES.CANCELLED,
    SESSION_STATES.EXPIRED,
  ],
  [SESSION_STATES.SCHEDULED]: [
    SESSION_STATES.READY,
    SESSION_STATES.CANCELLED,
    SESSION_STATES.EXPIRED,
  ],
  [SESSION_STATES.READY]: [
    SESSION_STATES.ACTIVE,
    SESSION_STATES.CANCELLED,
    SESSION_STATES.EXPIRED,
  ],
  [SESSION_STATES.ACTIVE]: [
    SESSION_STATES.PAUSED,
    SESSION_STATES.COMPLETED,
    SESSION_STATES.ABANDONED,
    SESSION_STATES.CANCELLED,
  ],
  [SESSION_STATES.PAUSED]: [
    SESSION_STATES.ACTIVE,
    SESSION_STATES.COMPLETED,
    SESSION_STATES.ABANDONED,
    SESSION_STATES.CANCELLED,
  ],
  [SESSION_STATES.COMPLETED]: [SESSION_STATES.DISPUTED],
  [SESSION_STATES.CANCELLED]: [],
  [SESSION_STATES.EXPIRED]: [],
  [SESSION_STATES.ABANDONED]: [SESSION_STATES.DISPUTED],
  [SESSION_STATES.DISPUTED]: [
    SESSION_STATES.COMPLETED,
    SESSION_STATES.ABANDONED,
    SESSION_STATES.CANCELLED,
  ],
};

export class StudySessionsService {
  private readonly sessions = new Map<string, StudySessionEntity>();
  private readonly sessionsByIdempotency = new Map<string, string>(); // `${hostId}:${key}` -> sessionId
  private readonly eventsBySession = new Map<string, SessionEventRecord[]>();
  private readonly clientEventIndex = new Map<string, SessionEventRecord>(); // `${sessionId}:${clientEventId}` -> event
  private readonly rejectedTransitions: RejectedTransitionLog[] = [];
  private readonly pingsBySession = new Map<string, AccountabilityPingEntity[]>();
  private readonly pingsByIdempotency = new Map<string, AccountabilityPingEntity>();
  private readonly disputesBySession = new Map<string, SessionDisputeEntity>();
  private readonly emergencyExitsByUser = new Map<string, Date[]>(); // userId -> timestamps

  private readonly studentsService: StudentsService;
  private readonly institutionsService: InstitutionsService;
  private readonly walletService: WalletService;
  private readonly eventBus: DomainEventBus;
  private readonly resumeSecret: string;

  constructor(
    studentsService: StudentsService,
    institutionsService: InstitutionsService,
    walletService: WalletService,
    eventBus: DomainEventBus,
    resumeSecret = 'cahootz-session-resume-secret-key'
  ) {
    this.studentsService = studentsService;
    this.institutionsService = institutionsService;
    this.walletService = walletService;
    this.eventBus = eventBus;
    this.resumeSecret = resumeSecret;
  }

  // ─── Session Creation (1:1 MVP Scope) ────────────────────────────

  async createSession(
    hostId: string,
    input: {
      partnerId: string;
      courseId: string;
      goal: string;
      mode?: string;
      plannedDurationMinutes?: number;
      pingResponseWindowSeconds?: number;
      scheduledStartAt?: Date;
      initialState?: 'CREATED' | 'INVITED' | 'SCHEDULED';
      idempotencyKey?: string;
      clientEventId?: string;
    },
    now: Date = new Date()
  ): Promise<StudySessionEntity> {
    if (hostId === input.partnerId) {
      throw AppError.validationFailed('Study sessions require two distinct students.');
    }

    if (input.idempotencyKey) {
      const existingId = this.sessionsByIdempotency.get(`${hostId}:${input.idempotencyKey}`);
      if (existingId) {
        return this.sessions.get(existingId)!;
      }
    }

    const hostProfile = this.studentsService.getOwnProfile(hostId);
    const partnerProfile = this.studentsService.findProfile(input.partnerId);
    if (!partnerProfile) {
      throw AppError.notFound('Partner student profile not found.');
    }

    // Strict institution boundary
    if (hostProfile.institutionId !== partnerProfile.institutionId) {
      throw AppError.forbidden('Cross-institution study sessions are not permitted.');
    }

    // Symmetric block check
    if (this.studentsService.isBlockedBetween(hostId, input.partnerId)) {
      throw AppError.notFound('Partner student profile not found.');
    }

    const course = this.institutionsService.getCourse(input.courseId);
    if (!course || course.institutionId !== hostProfile.institutionId) {
      throw AppError.validationFailed('Course does not belong to your institution.');
    }

    const plannedDurationMinutes =
      input.plannedDurationMinutes ?? SESSION_DEFAULTS.DEFAULT_DURATION_MINUTES;
    if (
      plannedDurationMinutes < SESSION_DEFAULTS.MIN_DURATION_MINUTES ||
      plannedDurationMinutes > SESSION_DEFAULTS.MAX_DURATION_MINUTES
    ) {
      throw AppError.validationFailed(
        `Session duration must be between ${SESSION_DEFAULTS.MIN_DURATION_MINUTES} and ${SESSION_DEFAULTS.MAX_DURATION_MINUTES} minutes.`
      );
    }

    const pingResponseWindowSeconds =
      input.pingResponseWindowSeconds ?? SESSION_DEFAULTS.DEFAULT_RESPONSE_WINDOW_SECONDS;
    if (
      pingResponseWindowSeconds < SESSION_DEFAULTS.MIN_RESPONSE_WINDOW_SECONDS ||
      pingResponseWindowSeconds > SESSION_DEFAULTS.MAX_RESPONSE_WINDOW_SECONDS
    ) {
      throw AppError.validationFailed(
        `Ping response window must be between ${SESSION_DEFAULTS.MIN_RESPONSE_WINDOW_SECONDS} and ${SESSION_DEFAULTS.MAX_RESPONSE_WINDOW_SECONDS} seconds.`
      );
    }

    const sessionId = uuidv7();
    const initialState = input.initialState ?? SESSION_STATES.SCHEDULED;

    const session: StudySessionEntity = {
      id: sessionId,
      institutionId: hostProfile.institutionId,
      courseId: input.courseId,
      hostId,
      partnerId: input.partnerId,
      goal: input.goal.trim(),
      mode: input.mode ?? 'POMODORO_25_5',
      plannedDurationMinutes,
      pingResponseWindowSeconds,
      state: initialState,
      version: 1,
      scheduledStartAt: input.scheduledStartAt ?? now,
      startedAt: null,
      pausedAt: null,
      pausedDurationSeconds: 0,
      endedAt: null,
      idempotencyKey: input.idempotencyKey ?? null,
      participants: {
        [hostId]: this.createInitialParticipantState(sessionId, hostId),
        [input.partnerId]: this.createInitialParticipantState(sessionId, input.partnerId),
      },
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);
    this.eventsBySession.set(sessionId, []);
    this.pingsBySession.set(sessionId, []);

    if (input.idempotencyKey) {
      this.sessionsByIdempotency.set(`${hostId}:${input.idempotencyKey}`, sessionId);
    }

    this.appendEvent(session, {
      actorId: hostId,
      eventType: 'session.created',
      fromState: null,
      toState: initialState,
      clientEventId: input.clientEventId ?? null,
      serverTimestamp: now,
      payload: {
        hostId,
        partnerId: input.partnerId,
        courseId: input.courseId,
        plannedDurationMinutes,
      },
    });

    await this.eventBus.publish('session.created', {
      sessionId,
      institutionId: session.institutionId,
      hostId,
      partnerId: input.partnerId,
    });

    return session;
  }

  private createInitialParticipantState(sessionId: string, userId: string): ParticipantState {
    const resumeToken = createHmac('sha256', this.resumeSecret)
      .update(`${sessionId}:${userId}:${uuidv7()}`)
      .digest('hex');

    return {
      userId,
      checkedInAt: null,
      presenceState: PRESENCE_STATES.OFFLINE_EXCUSED,
      lastHeartbeatAt: null,
      lastHeartbeatVisibility: 'VISIBLE',
      disconnectedAt: null,
      connectedSeconds: 0,
      excusedDisconnectSeconds: 0,
      missedConnectedPings: 0,
      missedDisconnectedPings: 0,
      answeredPings: 0,
      completionStatus: 'PENDING',
      xpAwarded: 0,
      resumeToken,
    };
  }

  // ─── Access Control (BOLA/IDOR Prevention) ───────────────────────

  getSessionForParticipant(userId: string, sessionId: string): StudySessionEntity {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw AppError.notFound('Study session not found.');
    }
    if (session.hostId !== userId && session.partnerId !== userId) {
      // Return 404 so non-participants cannot enumerate session IDs
      throw AppError.notFound('Study session not found.');
    }
    return session;
  }

  // ─── Check-In & Transition to READY / ACTIVE ─────────────────────

  async checkIn(
    userId: string,
    sessionId: string,
    options: {
      clientEventId?: string;
      clientTimestamp?: Date;
      expectedVersion?: number;
    } = {},
    now: Date = new Date()
  ): Promise<StudySessionEntity> {
    const session = this.getSessionForParticipant(userId, sessionId);

    // Client event idempotency
    if (options.clientEventId) {
      const dup = this.clientEventIndex.get(`${sessionId}:${options.clientEventId}`);
      if (dup) return session;
    }

    if (
      session.state !== SESSION_STATES.CREATED &&
      session.state !== SESSION_STATES.INVITED &&
      session.state !== SESSION_STATES.SCHEDULED &&
      session.state !== SESSION_STATES.READY
    ) {
      this.logRejectedTransition(
        session,
        userId,
        SESSION_STATES.READY,
        `Cannot check in when session is in state ${session.state}`,
        now
      );
      throw AppError.invalidState(`Cannot check in when session is in state ${session.state}.`);
    }

    const participant = session.participants[userId]!;
    participant.checkedInAt = participant.checkedInAt ?? now;
    participant.presenceState = PRESENCE_STATES.PRESENT;
    participant.lastHeartbeatAt = now;
    participant.disconnectedAt = null;

    const otherId = userId === session.hostId ? session.partnerId : session.hostId;
    const otherParticipant = session.participants[otherId]!;

    if (session.state !== SESSION_STATES.READY && !otherParticipant.checkedInAt) {
      this.transitionState(
        session,
        SESSION_STATES.READY,
        userId,
        'participant.checked_in',
        now,
        options
      );
    } else if (otherParticipant.checkedInAt) {
      // Both participants checked in! Start active timer immediately
      if (
        options.expectedVersion !== undefined &&
        options.expectedVersion !== session.version
      ) {
        throw AppError.conflict(
          `Optimistic concurrency conflict: expected version ${options.expectedVersion}, actual ${session.version}.`
        );
      }
      if (session.state !== SESSION_STATES.READY) {
        this.transitionState(
          session,
          SESSION_STATES.READY,
          userId,
          'participant.checked_in',
          now,
          options
        );
      }
      session.startedAt = now;
      this.transitionState(
        session,
        SESSION_STATES.ACTIVE,
        userId,
        'session.started',
        now,
        { clientEventId: options.clientEventId }
      );
      await this.eventBus.publish('session.started', {
        sessionId: session.id,
        startedAt: now.toISOString(),
      });
    } else {
      this.appendEvent(session, {
        actorId: userId,
        eventType: 'participant.checked_in',
        fromState: session.state,
        toState: session.state,
        clientEventId: options.clientEventId ?? null,
        clientTimestamp: options.clientTimestamp ?? null,
        serverTimestamp: now,
        payload: { userId },
      });
    }

    return session;
  }

  // ─── Server-Authoritative Timer (`7.5`) ──────────────────────────

  getTimerSnapshot(
    userId: string,
    sessionId: string,
    now: Date = new Date(),
    clientNow?: Date
  ): TimerSnapshot {
    const session = this.getSessionForParticipant(userId, sessionId);
    const totalPlannedSeconds = session.plannedDurationMinutes * 60;

    let currentPauseSeconds = 0;
    if (session.state === SESSION_STATES.PAUSED && session.pausedAt) {
      currentPauseSeconds = Math.max(
        0,
        Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
      );
    }
    const totalPausedSeconds = session.pausedDurationSeconds + currentPauseSeconds;

    let elapsedActiveSeconds = 0;
    let plannedEnd: Date | null = null;

    if (session.startedAt) {
      const referenceEnd = session.endedAt ?? now;
      const wallElapsedSeconds = Math.max(
        0,
        Math.floor((referenceEnd.getTime() - session.startedAt.getTime()) / 1000)
      );
      elapsedActiveSeconds = Math.max(0, wallElapsedSeconds - totalPausedSeconds);
      plannedEnd = new Date(
        session.startedAt.getTime() + (totalPlannedSeconds + totalPausedSeconds) * 1000
      );
    }

    const remainingSeconds = Math.max(0, totalPlannedSeconds - elapsedActiveSeconds);
    const clientClockSkewMs = clientNow ? clientNow.getTime() - now.getTime() : null;

    return {
      sessionId: session.id,
      state: session.state,
      version: session.version,
      serverNow: now.toISOString(),
      startedAt: session.startedAt ? session.startedAt.toISOString() : null,
      plannedEnd: plannedEnd ? plannedEnd.toISOString() : null,
      pausedDurationSeconds: totalPausedSeconds,
      elapsedActiveSeconds,
      remainingSeconds,
      clientClockSkewMs,
    };
  }

  // ─── Presence, Heartbeats, Technical Disconnect & Reconnect (`7.6`) ───

  recordHeartbeat(
    userId: string,
    sessionId: string,
    input: {
      visibility?: 'VISIBLE' | 'BACKGROUND';
      clientEventId?: string;
      clientSeq?: number;
      clientTimestamp?: Date;
    } = {},
    now: Date = new Date()
  ): ParticipantState {
    const session = this.getSessionForParticipant(userId, sessionId);

    // Idempotent duplicate clientEventId handling
    if (input.clientEventId) {
      const existing = this.clientEventIndex.get(`${sessionId}:${input.clientEventId}`);
      if (existing) {
        return session.participants[userId]!;
      }
    }

    const p = session.participants[userId]!;

    // Out-of-order client event check: if clientTimestamp is older than lastHeartbeatAt, log it without regressing state
    if (
      input.clientTimestamp &&
      p.lastHeartbeatAt &&
      input.clientTimestamp.getTime() < p.lastHeartbeatAt.getTime() &&
      now.getTime() === p.lastHeartbeatAt.getTime()
    ) {
      this.appendEvent(session, {
        actorId: userId,
        eventType: 'heartbeat.out_of_order_ignored',
        fromState: session.state,
        toState: session.state,
        clientEventId: input.clientEventId ?? null,
        clientSeq: input.clientSeq ?? null,
        clientTimestamp: input.clientTimestamp,
        serverTimestamp: now,
        payload: { visibility: input.visibility ?? 'VISIBLE' },
      });
      return p;
    }

    // Accrue connected time or excused disconnect time since previous heartbeat
    this.accrueParticipantTime(session, p, now);

    p.presenceState = PRESENCE_STATES.PRESENT;
    p.lastHeartbeatAt = now;
    p.lastHeartbeatVisibility = input.visibility ?? 'VISIBLE';
    p.disconnectedAt = null;
    session.updatedAt = now;

    if (input.clientEventId) {
      this.appendEvent(session, {
        actorId: userId,
        eventType: 'participant.heartbeat',
        fromState: session.state,
        toState: session.state,
        clientEventId: input.clientEventId,
        clientSeq: input.clientSeq ?? null,
        clientTimestamp: input.clientTimestamp ?? null,
        serverTimestamp: now,
        payload: { visibility: p.lastHeartbeatVisibility },
      });
    }

    return p;
  }

  /**
   * Marks a participant as experiencing a technical network drop or TTL expiry.
   */
  reportNetworkDisconnect(
    userId: string,
    sessionId: string,
    now: Date = new Date()
  ): ParticipantState {
    const session = this.getSessionForParticipant(userId, sessionId);
    const p = session.participants[userId]!;

    // Accrue connected time up to the moment of disconnect
    if (p.presenceState === PRESENCE_STATES.PRESENT && p.lastHeartbeatAt) {
      const deltaSec = Math.max(
        0,
        Math.floor((now.getTime() - p.lastHeartbeatAt.getTime()) / 1000)
      );
      p.connectedSeconds += deltaSec;
    }

    p.presenceState = PRESENCE_STATES.AWAY_UNREACHABLE;
    p.disconnectedAt = p.disconnectedAt ?? now;
    p.lastHeartbeatAt = now;

    this.appendEvent(session, {
      actorId: userId,
      eventType: 'participant.disconnected',
      fromState: session.state,
      toState: session.state,
      serverTimestamp: now,
      payload: { userId, presenceState: p.presenceState },
    });

    return p;
  }

  /**
   * Reconnects a participant using their session `resumeToken`.
   * If reconnected within the 5-minute grace window (`PRESENCE.GRACE_PERIOD_SECONDS = 300`),
   * the disconnect interval is recorded as `excusedDisconnectSeconds` with ZERO penalty!
   */
  reconnectWithResumeToken(
    userId: string,
    sessionId: string,
    resumeToken: string,
    now: Date = new Date()
  ): { session: StudySessionEntity; excusedDisconnectSeconds: number; timer: TimerSnapshot } {
    const session = this.getSessionForParticipant(userId, sessionId);
    const p = session.participants[userId]!;

    if (p.resumeToken !== resumeToken) {
      throw AppError.forbidden('Invalid session resume token.');
    }

    const disconnectStart = p.disconnectedAt ?? p.lastHeartbeatAt;
    if (disconnectStart && p.presenceState !== PRESENCE_STATES.PRESENT) {
      const outageSeconds = Math.max(
        0,
        Math.floor((now.getTime() - disconnectStart.getTime()) / 1000)
      );
      if (outageSeconds <= PRESENCE.GRACE_PERIOD_SECONDS) {
        // Within 5-minute reconnect grace window -> 100% excused!
        p.excusedDisconnectSeconds += outageSeconds;
      } else {
        // Excuse up to the grace period
        p.excusedDisconnectSeconds += PRESENCE.GRACE_PERIOD_SECONDS;
      }
    }

    // Any pending pings that expired while the participant was disconnected must be resolved as MISSED_DISCONNECTED before restoring PRESENT
    const pings = this.pingsBySession.get(sessionId) ?? [];
    for (const ping of pings) {
      if (
        ping.recipientId === userId &&
        ping.outcome === 'PENDING' &&
        now > ping.expiresAt
      ) {
        this.resolveExpiredPing(session, ping, now);
      }
    }

    p.presenceState = PRESENCE_STATES.PRESENT;
    p.disconnectedAt = null;
    p.lastHeartbeatAt = now;

    this.appendEvent(session, {
      actorId: userId,
      eventType: 'participant.reconnected',
      fromState: session.state,
      toState: session.state,
      serverTimestamp: now,
      payload: {
        userId,
        excusedDisconnectSeconds: p.excusedDisconnectSeconds,
      },
    });

    return {
      session,
      excusedDisconnectSeconds: p.excusedDisconnectSeconds,
      timer: this.getTimerSnapshot(userId, sessionId, now),
    };
  }

  private accrueParticipantTime(
    session: StudySessionEntity,
    p: ParticipantState,
    now: Date
  ): void {
    if (session.state !== SESSION_STATES.ACTIVE || !p.lastHeartbeatAt) {
      return;
    }

    const gapSeconds = Math.max(
      0,
      Math.floor((now.getTime() - p.lastHeartbeatAt.getTime()) / 1000)
    );
    if (gapSeconds === 0) return;

    if (p.presenceState === PRESENCE_STATES.PRESENT) {
      if (gapSeconds <= PRESENCE.PRESENCE_TTL_SECONDS) {
        p.connectedSeconds += gapSeconds;
      } else if (gapSeconds <= PRESENCE.GRACE_PERIOD_SECONDS) {
        // Heartbeat gap > 45s TTL but <= 5m grace -> first 45s connected, remainder excused technical drop
        p.connectedSeconds += PRESENCE.PRESENCE_TTL_SECONDS;
        p.excusedDisconnectSeconds += gapSeconds - PRESENCE.PRESENCE_TTL_SECONDS;
      } else {
        p.connectedSeconds += PRESENCE.PRESENCE_TTL_SECONDS;
        p.excusedDisconnectSeconds +=
          PRESENCE.GRACE_PERIOD_SECONDS - PRESENCE.PRESENCE_TTL_SECONDS;
      }
    } else if (p.presenceState === PRESENCE_STATES.AWAY_UNREACHABLE) {
      if (gapSeconds <= PRESENCE.GRACE_PERIOD_SECONDS) {
        p.excusedDisconnectSeconds += gapSeconds;
      }
    }
  }

  // ─── Pause & Resume (`ACTIVE <-> PAUSED`) ────────────────────────

  pauseSession(
    userId: string,
    sessionId: string,
    options: { reason?: string; expectedVersion?: number; clientEventId?: string } = {},
    now: Date = new Date()
  ): StudySessionEntity {
    const session = this.getSessionForParticipant(userId, sessionId);

    // Accrue active connected time for both participants before pausing
    for (const part of Object.values(session.participants)) {
      this.accrueParticipantTime(session, part, now);
      part.lastHeartbeatAt = now;
      part.presenceState = PRESENCE_STATES.OFFLINE_EXCUSED;
    }

    this.transitionState(
      session,
      SESSION_STATES.PAUSED,
      userId,
      'session.paused',
      now,
      options,
      { reason: options.reason ?? 'User paused' }
    );
    session.pausedAt = now;
    return session;
  }

  resumeSession(
    userId: string,
    sessionId: string,
    options: { expectedVersion?: number; clientEventId?: string } = {},
    now: Date = new Date()
  ): StudySessionEntity {
    const session = this.getSessionForParticipant(userId, sessionId);

    if (session.state === SESSION_STATES.PAUSED && session.pausedAt) {
      const pauseDeltaSec = Math.max(
        0,
        Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
      );
      session.pausedDurationSeconds += pauseDeltaSec;
      session.pausedAt = null;
    }

    for (const part of Object.values(session.participants)) {
      part.lastHeartbeatAt = now;
      part.presenceState = PRESENCE_STATES.PRESENT;
    }

    this.transitionState(
      session,
      SESSION_STATES.ACTIVE,
      userId,
      'session.resumed',
      now,
      options
    );
    return session;
  }

  // ─── Accountability Pings (`7.7` — Never Punish Disconnected Students) ───

  sendAccountabilityPing(
    senderId: string,
    sessionId: string,
    options: { idempotencyKey?: string; clientEventId?: string } = {},
    now: Date = new Date()
  ): AccountabilityPingEntity {
    const session = this.getSessionForParticipant(senderId, sessionId);
    if (session.state !== SESSION_STATES.ACTIVE) {
      throw AppError.invalidState('Accountability pings can only be sent during an ACTIVE session.');
    }

    if (options.idempotencyKey) {
      const key = `${sessionId}:${senderId}:${options.idempotencyKey}`;
      const existing = this.pingsByIdempotency.get(key);
      if (existing) return existing;
    }

    const sessionPings = this.pingsBySession.get(sessionId)!;
    const sentBySender = sessionPings.filter((p) => p.senderId === senderId).length;
    if (sentBySender >= RATE_LIMITS.PINGS_PER_SESSION) {
      throw AppError.rateLimited(
        `Maximum pings per session (${RATE_LIMITS.PINGS_PER_SESSION}) reached.`
      );
    }

    const recipientId = senderId === session.hostId ? session.partnerId : session.hostId;
    const ping: AccountabilityPingEntity = {
      id: uuidv7(),
      sessionId,
      senderId,
      recipientId,
      idempotencyKey: options.idempotencyKey ?? null,
      sentAt: now,
      expiresAt: new Date(now.getTime() + session.pingResponseWindowSeconds * 1000),
      respondedAt: null,
      outcome: 'PENDING',
    };

    sessionPings.push(ping);
    if (options.idempotencyKey) {
      this.pingsByIdempotency.set(`${sessionId}:${senderId}:${options.idempotencyKey}`, ping);
    }

    this.appendEvent(session, {
      actorId: senderId,
      eventType: 'ping.sent',
      fromState: session.state,
      toState: session.state,
      clientEventId: options.clientEventId ?? null,
      serverTimestamp: now,
      payload: { pingId: ping.id, recipientId, expiresAt: ping.expiresAt.toISOString() },
    });

    return ping;
  }

  respondToPing(
    recipientId: string,
    sessionId: string,
    pingId: string,
    now: Date = new Date()
  ): AccountabilityPingEntity {
    const session = this.getSessionForParticipant(recipientId, sessionId);
    const pings = this.pingsBySession.get(sessionId) ?? [];
    const ping = pings.find((p) => p.id === pingId);
    if (!ping) {
      throw AppError.notFound('Accountability ping not found.');
    }
    if (ping.recipientId !== recipientId) {
      throw AppError.forbidden('Only the pinged participant can respond to this ping.');
    }
    if (ping.outcome !== 'PENDING') {
      return ping; // Idempotent if already answered/resolved
    }

    const recipientState = session.participants[recipientId]!;

    if (now <= ping.expiresAt) {
      ping.outcome = PING_OUTCOMES.ANSWERED;
      ping.respondedAt = now;
      recipientState.answeredPings += 1;
    } else {
      // Expired before response: evaluate whether recipient was disconnected or connected
      this.resolveExpiredPing(session, ping, now);
    }

    this.appendEvent(session, {
      actorId: recipientId,
      eventType: 'ping.resolved',
      fromState: session.state,
      toState: session.state,
      serverTimestamp: now,
      payload: { pingId: ping.id, outcome: ping.outcome },
    });

    return ping;
  }

  private resolveExpiredPing(
    session: StudySessionEntity,
    ping: AccountabilityPingEntity,
    now: Date
  ): void {
    if (ping.outcome !== 'PENDING') return;

    const recipientState = session.participants[ping.recipientId]!;
    const lastHb = recipientState.lastHeartbeatAt;
    const isTtlExpired =
      !lastHb ||
      (ping.expiresAt.getTime() - lastHb.getTime()) / 1000 > PRESENCE.PRESENCE_TTL_SECONDS;

    if (session.state === SESSION_STATES.PAUSED || recipientState.presenceState === PRESENCE_STATES.OFFLINE_EXCUSED) {
      ping.outcome = PING_OUTCOMES.EXCUSED;
    } else if (
      recipientState.presenceState === PRESENCE_STATES.AWAY_UNREACHABLE ||
      recipientState.disconnectedAt !== null ||
      isTtlExpired
    ) {
      // Fairness Rule #6: Technical disconnection during ping -> MISSED_DISCONNECTED (zero penalty!)
      ping.outcome = PING_OUTCOMES.MISSED_DISCONNECTED;
      recipientState.missedDisconnectedPings += 1;
    } else {
      // Healthy connection throughout ping window, but did not respond -> MISSED_CONNECTED
      ping.outcome = PING_OUTCOMES.MISSED_CONNECTED;
      recipientState.missedConnectedPings += 1;
    }
    ping.respondedAt = now;
  }

  // ─── Session Completion & Evaluation (`7.10` + `D-012`: 70% threshold) ───

  async completeSession(
    actorUserId: string,
    sessionId: string,
    options: {
      emergencyExitReason?: string;
      expectedVersion?: number;
      clientEventId?: string;
    } = {},
    now: Date = new Date()
  ): Promise<StudySessionEntity> {
    const session = this.getSessionForParticipant(actorUserId, sessionId);

    if (options.emergencyExitReason) {
      this.recordEmergencyExitUsage(actorUserId, now);
    }

    // Accrue remaining time for both participants
    for (const part of Object.values(session.participants)) {
      this.accrueParticipantTime(session, part, now);
    }

    // Resolve any pending expired pings
    const pings = this.pingsBySession.get(sessionId) ?? [];
    for (const ping of pings) {
      if (ping.outcome === 'PENDING') {
        if (now > ping.expiresAt) {
          this.resolveExpiredPing(session, ping, now);
        } else {
          ping.outcome = PING_OUTCOMES.EXCUSED;
        }
      }
    }

    this.transitionState(
      session,
      SESSION_STATES.COMPLETED,
      actorUserId,
      'session.completed',
      now,
      options,
      { emergencyExitReason: options.emergencyExitReason ?? null }
    );
    session.endedAt = now;

    const plannedSeconds = session.plannedDurationMinutes * 60;

    for (const part of Object.values(session.participants)) {
      const partnerId = part.userId === session.hostId ? session.partnerId : session.hostId;
      // Effective credited time = connectedSeconds + excusedDisconnectSeconds (up to 5m reconnect grace)
      const effectiveSeconds = part.connectedSeconds + part.excusedDisconnectSeconds;
      const ratio = plannedSeconds > 0 ? effectiveSeconds / plannedSeconds : 1;

      if (
        ratio >= COMPLETION.FULL_COMPLETION_THRESHOLD &&
        part.missedConnectedPings <= COMPLETION.MAX_CONNECTED_MISSED_PINGS &&
        !options.emergencyExitReason
      ) {
        part.completionStatus = 'FULL';
        const { entry } = await this.walletService.awardSessionXp({
          userId: part.userId,
          sessionId: session.id,
          partnerId,
          durationMinutes: session.plannedDurationMinutes,
          completionType: 'FULL',
          now,
        });
        part.xpAwarded = entry.amount;
        this.walletService.recordSessionReliabilityOutcome(part.userId, 'FULL_COMPLETE', now);
      } else if (
        ratio >= COMPLETION.PARTIAL_COMPLETION_THRESHOLD ||
        Boolean(options.emergencyExitReason)
      ) {
        part.completionStatus = 'PARTIAL';
        const effectiveMinutes = Math.max(15, Math.round(effectiveSeconds / 60));
        const { entry } = await this.walletService.awardSessionXp({
          userId: part.userId,
          sessionId: session.id,
          partnerId,
          durationMinutes: effectiveMinutes,
          completionType: 'PARTIAL',
          now,
        });
        part.xpAwarded = entry.amount;
        this.walletService.recordSessionReliabilityOutcome(part.userId, 'PARTIAL_COMPLETE', now);
      } else {
        part.completionStatus = 'INCOMPLETE';
        part.xpAwarded = 0;
        // If incomplete was caused by extended technical disconnection, do not penalize reliability
        if (part.excusedDisconnectSeconds > 0 || part.missedDisconnectedPings > 0) {
          this.walletService.recordSessionReliabilityOutcome(
            part.userId,
            'EXCUSED_DISCONNECT',
            now
          );
        } else {
          this.walletService.recordSessionReliabilityOutcome(
            part.userId,
            'UNEXCUSED_ABANDON',
            now
          );
        }
      }
    }

    await this.eventBus.publish('session.completed', {
      sessionId: session.id,
      institutionId: session.institutionId,
      hostId: session.hostId,
      partnerId: session.partnerId,
    });

    return session;
  }

  async abandonSession(
    actorUserId: string,
    sessionId: string,
    reason = 'Grace period exceeded',
    now: Date = new Date()
  ): Promise<StudySessionEntity> {
    const session = this.getSessionForParticipant(actorUserId, sessionId);
    this.transitionState(
      session,
      SESSION_STATES.ABANDONED,
      actorUserId,
      'session.abandoned',
      now,
      {},
      { reason }
    );
    session.endedAt = now;
    return session;
  }

  async cancelSession(
    actorUserId: string,
    sessionId: string,
    reason = 'Cancelled by participant',
    now: Date = new Date()
  ): Promise<StudySessionEntity> {
    const session = this.getSessionForParticipant(actorUserId, sessionId);
    this.transitionState(
      session,
      SESSION_STATES.CANCELLED,
      actorUserId,
      'session.cancelled',
      now,
      {},
      { reason }
    );
    session.endedAt = now;
    return session;
  }

  private recordEmergencyExitUsage(userId: string, now: Date): void {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recent = (this.emergencyExitsByUser.get(userId) ?? []).filter(
      (ts) => ts >= oneWeekAgo
    );
    if (recent.length >= EMERGENCY_EXIT.MAX_PER_WEEK) {
      throw AppError.rateLimited(
        `Maximum consented emergency exits per week (${EMERGENCY_EXIT.MAX_PER_WEEK}) exceeded.`
      );
    }
    recent.push(now);
    this.emergencyExitsByUser.set(userId, recent);
  }

  // ─── Disputes (`7.12` + `D-013`: 24-hour window) ─────────────────

  async fileDispute(
    userId: string,
    sessionId: string,
    reason: string,
    now: Date = new Date()
  ): Promise<SessionDisputeEntity> {
    const session = this.getSessionForParticipant(userId, sessionId);

    if (
      session.state !== SESSION_STATES.COMPLETED &&
      session.state !== SESSION_STATES.ABANDONED
    ) {
      throw AppError.invalidState(
        'Disputes can only be filed for COMPLETED or ABANDONED sessions.'
      );
    }

    if (session.endedAt) {
      const hoursSinceEnd =
        (now.getTime() - session.endedAt.getTime()) / (60 * 60 * 1000);
      if (hoursSinceEnd > DISPUTES.DISPUTE_WINDOW_HOURS) {
        throw AppError.validationFailed(
          `The ${DISPUTES.DISPUTE_WINDOW_HOURS}-hour dispute window for this session has closed.`
        );
      }
    }

    if (this.disputesBySession.has(sessionId)) {
      throw AppError.conflict('A dispute has already been filed for this session.');
    }

    this.transitionState(
      session,
      SESSION_STATES.DISPUTED,
      userId,
      'session.disputed',
      now,
      {},
      { reason }
    );

    const events = this.eventsBySession.get(sessionId) ?? [];
    const part = session.participants[userId]!;

    // Auto-resolution check against append-only session events:
    // If the event log proves a disconnect/reconnect or missed_disconnected ping occurred,
    // automatically resolve in the student's favour!
    const hasDisconnectEvidence =
      part.excusedDisconnectSeconds > 0 ||
      part.missedDisconnectedPings > 0 ||
      events.some(
        (e) =>
          e.actorId === userId &&
          (e.eventType === 'participant.disconnected' ||
            e.eventType === 'participant.reconnected')
      );

    const dispute: SessionDisputeEntity = {
      id: uuidv7(),
      sessionId,
      filedByUserId: userId,
      reason: reason.trim(),
      status: hasDisconnectEvidence ? 'AUTO_RESOLVED_APPROVED' : 'PENDING_MOD_REVIEW',
      resolutionNote: hasDisconnectEvidence
        ? 'Auto-resolved in student favour: heartbeat/event log confirmed technical disconnection.'
        : null,
      resolvedByUserId: hasDisconnectEvidence ? 'system:auto-resolver' : null,
      filedAt: now,
      resolvedAt: hasDisconnectEvidence ? now : null,
    };

    this.disputesBySession.set(sessionId, dispute);

    if (hasDisconnectEvidence) {
      await this.grantDisputeCredit(session, userId, now);
      this.transitionState(
        session,
        SESSION_STATES.COMPLETED,
        userId,
        'dispute.auto_resolved',
        now,
        {},
        { disputeId: dispute.id }
      );
    }

    return dispute;
  }

  async resolveDisputeByModerator(
    moderator: Actor,
    sessionId: string,
    decision: 'APPROVE' | 'REJECT',
    note: string,
    now: Date = new Date()
  ): Promise<SessionDisputeEntity> {
    if (!hasAnyRole(moderator, STAFF_ROLES)) {
      throw AppError.forbidden('Moderator privileges required to resolve disputes.');
    }

    const session = this.sessions.get(sessionId);
    const dispute = this.disputesBySession.get(sessionId);
    if (!session || !dispute) {
      throw AppError.notFound('Session dispute not found.');
    }

    if (decision === 'APPROVE') {
      dispute.status = 'MOD_APPROVED';
      dispute.resolutionNote = note;
      dispute.resolvedByUserId = moderator.userId;
      dispute.resolvedAt = now;
      await this.grantDisputeCredit(session, dispute.filedByUserId, now);
      this.transitionState(
        session,
        SESSION_STATES.COMPLETED,
        moderator.userId,
        'dispute.mod_approved',
        now,
        {},
        { disputeId: dispute.id }
      );
    } else {
      dispute.status = 'MOD_REJECTED';
      dispute.resolutionNote = note;
      dispute.resolvedByUserId = moderator.userId;
      dispute.resolvedAt = now;
      this.transitionState(
        session,
        SESSION_STATES.ABANDONED,
        moderator.userId,
        'dispute.mod_rejected',
        now,
        {},
        { disputeId: dispute.id }
      );
    }

    return dispute;
  }

  private async grantDisputeCredit(
    session: StudySessionEntity,
    userId: string,
    now: Date
  ): Promise<void> {
    const part = session.participants[userId]!;
    const partnerId = userId === session.hostId ? session.partnerId : session.hostId;
    part.completionStatus = 'FULL';
    const { entry } = await this.walletService.awardSessionXp({
      userId,
      sessionId: session.id,
      partnerId,
      durationMinutes: session.plannedDurationMinutes,
      completionType: 'DISPUTE_RESOLVED',
      now,
    });
    part.xpAwarded += entry.amount;
    this.walletService.recordSessionReliabilityOutcome(userId, 'FULL_COMPLETE', now);
  }

  // ─── State Transition Engine & Append-Only Event Log ─────────────

  private transitionState(
    session: StudySessionEntity,
    targetState: SessionState,
    actorId: string,
    eventType: string,
    now: Date,
    options: {
      expectedVersion?: number;
      clientEventId?: string;
      clientSeq?: number;
      clientTimestamp?: Date;
    } = {},
    payload: Record<string, unknown> = {}
  ): void {
    // 1. Optimistic concurrency check
    if (
      options.expectedVersion !== undefined &&
      options.expectedVersion !== session.version
    ) {
      throw AppError.conflict(
        `Optimistic concurrency conflict: expected version ${options.expectedVersion}, actual ${session.version}.`
      );
    }

    // 2. Validate against transition table
    const allowed = ALLOWED_TRANSITIONS[session.state];
    if (!allowed.includes(targetState)) {
      this.logRejectedTransition(
        session,
        actorId,
        targetState,
        `Illegal transition from ${session.state} to ${targetState}`,
        now
      );
      throw AppError.invalidState(
        `Invalid session state transition from ${session.state} to ${targetState}.`
      );
    }

    const previousState = session.state;
    session.state = targetState;
    session.version += 1;
    session.updatedAt = now;

    this.appendEvent(session, {
      actorId,
      eventType,
      fromState: previousState,
      toState: targetState,
      clientEventId: options.clientEventId ?? null,
      clientSeq: options.clientSeq ?? null,
      clientTimestamp: options.clientTimestamp ?? null,
      serverTimestamp: now,
      payload,
    });
  }

  private appendEvent(
    session: StudySessionEntity,
    input: {
      actorId: string | null;
      eventType: string;
      fromState: SessionState | null;
      toState: SessionState | null;
      clientEventId?: string | null;
      clientSeq?: number | null;
      clientTimestamp?: Date | null;
      serverTimestamp: Date;
      payload: Record<string, unknown>;
    }
  ): SessionEventRecord {
    const list = this.eventsBySession.get(session.id)!;
    const seq = list.length + 1;

    const record: SessionEventRecord = {
      id: uuidv7(),
      sessionId: session.id,
      seq,
      actorId: input.actorId,
      eventType: input.eventType,
      fromState: input.fromState,
      toState: input.toState,
      clientEventId: input.clientEventId ?? null,
      clientSeq: input.clientSeq ?? null,
      clientTimestamp: input.clientTimestamp ?? null,
      serverTimestamp: input.serverTimestamp,
      payload: input.payload,
    };

    list.push(record);
    if (record.clientEventId) {
      this.clientEventIndex.set(`${session.id}:${record.clientEventId}`, record);
    }
    return record;
  }

  private logRejectedTransition(
    session: StudySessionEntity,
    actorId: string,
    attemptedTo: SessionState,
    reason: string,
    timestamp: Date
  ): void {
    this.rejectedTransitions.push({
      id: uuidv7(),
      sessionId: session.id,
      actorId,
      attemptedFrom: session.state,
      attemptedTo,
      reason,
      timestamp,
    });
  }

  getSessionEvents(userId: string, sessionId: string): SessionEventRecord[] {
    this.getSessionForParticipant(userId, sessionId);
    return [...(this.eventsBySession.get(sessionId) ?? [])];
  }

  getPingsForParticipant(userId: string, sessionId: string): AccountabilityPingEntity[] {
    this.getSessionForParticipant(userId, sessionId);
    return [...(this.pingsBySession.get(sessionId) ?? [])];
  }

  getDisputeForSession(userId: string, sessionId: string): SessionDisputeEntity | null {
    this.getSessionForParticipant(userId, sessionId);
    return this.disputesBySession.get(sessionId) ?? null;
  }

  listSessionsForUser(userId: string): StudySessionEntity[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.hostId === userId || s.partnerId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getRejectedTransitions(sessionId: string): RejectedTransitionLog[] {
    return this.rejectedTransitions.filter((r) => r.sessionId === sessionId);
  }

  listCompletedSessions(institutionId?: string): StudySessionEntity[] {
    return Array.from(this.sessions.values()).filter(
      (s) =>
        s.state === SESSION_STATES.COMPLETED &&
        (!institutionId || s.institutionId === institutionId)
    );
  }

  hasSharedSessionBetween(userA: string, userB: string): boolean {
    for (const s of this.sessions.values()) {
      if (
        (s.hostId === userA && s.partnerId === userB) ||
        (s.hostId === userB && s.partnerId === userA)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Public transition method validating participant ownership and the `ALLOWED_TRANSITIONS` matrix.
   */
  requestTransition(
    actorUserId: string,
    sessionId: string,
    targetState: SessionState,
    now: Date = new Date()
  ): StudySessionEntity {
    const session = this.getSessionForParticipant(actorUserId, sessionId);
    this.transitionState(
      session,
      targetState,
      actorUserId,
      `session.transition_${targetState.toLowerCase()}`,
      now
    );
    return session;
  }

  listAllSessionsForPersistence(): StudySessionEntity[] {
    return Array.from(this.sessions.values());
  }

  hydrateFromSql(
    sessions: StudySessionEntity[],
    events: SessionEventRecord[]
  ): void {
    for (const s of sessions) {
      this.sessions.set(s.id, s);
      if (s.idempotencyKey) {
        this.sessionsByIdempotency.set(`${s.hostId}:${s.idempotencyKey}`, s.id);
      }
      this.eventsBySession.set(s.id, []);
      this.pingsBySession.set(s.id, []);
    }
    for (const ev of events) {
      const list = this.eventsBySession.get(ev.sessionId) ?? [];
      list.push(ev);
      this.eventsBySession.set(ev.sessionId, list);
      if (ev.clientEventId) {
        this.clientEventIndex.set(`${ev.sessionId}:${ev.clientEventId}`, ev);
      }
    }
  }
}
