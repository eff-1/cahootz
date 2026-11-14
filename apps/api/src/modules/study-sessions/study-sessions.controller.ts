import { type AuthenticatedUser } from '../../common/guards/jwt-auth.guard.ts';
import {
  type AccountabilityPingEntity,
  type ParticipantState,
  type SessionDisputeEntity,
  type SessionEventRecord,
  type StudySessionEntity,
  type StudySessionsService,
  type TimerSnapshot,
} from './study-sessions.service.ts';

export class StudySessionsController {
  private readonly studySessionsService: StudySessionsService;

  constructor(studySessionsService: StudySessionsService) {
    this.studySessionsService = studySessionsService;
  }

  createSession(
    user: AuthenticatedUser,
    body: {
      partnerId: string;
      courseId: string;
      goal: string;
      mode?: string;
      plannedDurationMinutes?: number;
      pingResponseWindowSeconds?: number;
      scheduledStartAt?: string;
      clientEventId?: string;
    },
    idempotencyKey?: string
  ): Promise<StudySessionEntity> {
    return this.studySessionsService.createSession(user.id, {
      partnerId: body.partnerId,
      courseId: body.courseId,
      goal: body.goal,
      mode: body.mode,
      plannedDurationMinutes: body.plannedDurationMinutes,
      pingResponseWindowSeconds: body.pingResponseWindowSeconds,
      scheduledStartAt: body.scheduledStartAt ? new Date(body.scheduledStartAt) : undefined,
      idempotencyKey,
      clientEventId: body.clientEventId,
    });
  }

  checkIn(
    user: AuthenticatedUser,
    sessionId: string,
    body: { clientEventId?: string; expectedVersion?: number } = {}
  ): Promise<StudySessionEntity> {
    return this.studySessionsService.checkIn(user.id, sessionId, body);
  }

  getTimer(
    user: AuthenticatedUser,
    sessionId: string,
    clientNowIso?: string
  ): TimerSnapshot {
    return this.studySessionsService.getTimerSnapshot(
      user.id,
      sessionId,
      new Date(),
      clientNowIso ? new Date(clientNowIso) : undefined
    );
  }

  heartbeat(
    user: AuthenticatedUser,
    sessionId: string,
    body: {
      visibility?: 'VISIBLE' | 'BACKGROUND';
      clientEventId?: string;
      clientSeq?: number;
      clientTimestamp?: string;
    } = {}
  ): ParticipantState {
    return this.studySessionsService.recordHeartbeat(user.id, sessionId, {
      visibility: body.visibility,
      clientEventId: body.clientEventId,
      clientSeq: body.clientSeq,
      clientTimestamp: body.clientTimestamp ? new Date(body.clientTimestamp) : undefined,
    });
  }

  reconnect(
    user: AuthenticatedUser,
    sessionId: string,
    body: { resumeToken: string }
  ) {
    return this.studySessionsService.reconnectWithResumeToken(
      user.id,
      sessionId,
      body.resumeToken
    );
  }

  pause(
    user: AuthenticatedUser,
    sessionId: string,
    body: { reason?: string; expectedVersion?: number; clientEventId?: string } = {}
  ): StudySessionEntity {
    return this.studySessionsService.pauseSession(user.id, sessionId, body);
  }

  resume(
    user: AuthenticatedUser,
    sessionId: string,
    body: { expectedVersion?: number; clientEventId?: string } = {}
  ): StudySessionEntity {
    return this.studySessionsService.resumeSession(user.id, sessionId, body);
  }

  sendPing(
    user: AuthenticatedUser,
    sessionId: string,
    idempotencyKey?: string,
    clientEventId?: string
  ): AccountabilityPingEntity {
    return this.studySessionsService.sendAccountabilityPing(user.id, sessionId, {
      idempotencyKey,
      clientEventId,
    });
  }

  respondPing(
    user: AuthenticatedUser,
    sessionId: string,
    pingId: string
  ): AccountabilityPingEntity {
    return this.studySessionsService.respondToPing(user.id, sessionId, pingId);
  }

  complete(
    user: AuthenticatedUser,
    sessionId: string,
    body: {
      emergencyExitReason?: string;
      expectedVersion?: number;
      clientEventId?: string;
    } = {}
  ): Promise<StudySessionEntity> {
    return this.studySessionsService.completeSession(user.id, sessionId, body);
  }

  fileDispute(
    user: AuthenticatedUser,
    sessionId: string,
    body: { reason: string }
  ): Promise<SessionDisputeEntity> {
    return this.studySessionsService.fileDispute(user.id, sessionId, body.reason);
  }

  listEvents(user: AuthenticatedUser, sessionId: string): { items: SessionEventRecord[] } {
    return {
      items: this.studySessionsService.getSessionEvents(user.id, sessionId),
    };
  }
}
