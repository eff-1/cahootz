import {
  COMPLETION,
  SESSION_STATES,
} from '../../../../../packages/shared/src/index.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type StudySessionsService } from '../study-sessions/study-sessions.service.ts';

export interface TelemetryEvent {
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface NorthStarSummary {
  windowStart: string;
  windowEnd: string;
  activeStudentsCount: number;
  qualifyingCompletedSessionsCount: number; // Completed sessions >= 25 min
  weeklyCompletedSessionsPerActiveStudent: number;
}

export interface FunnelMetrics {
  registeredUsers: number;
  onboardedStudents: number;
  invitationsSent: number;
  invitationsAccepted: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  sessionCompletionRatePercent: number;
}

export class AnalyticsService {
  private readonly telemetryLog: TelemetryEvent[] = [];
  private readonly studySessionsService: StudySessionsService;

  constructor(
    eventBus: DomainEventBus,
    studySessionsService: StudySessionsService
  ) {
    this.studySessionsService = studySessionsService;

    const trackedEvents = [
      'user.registered',
      'student.onboarded',
      'student.enrolled',
      'student.verified_email_domain',
      'invitation.sent',
      'invitation.accepted',
      'invitation.declined',
      'session.created',
      'session.started',
      'session.completed',
      'wallet.xp_awarded',
      'moderation.report_created',
      'moderation.sanction_applied',
    ];

    for (const evt of trackedEvents) {
      eventBus.subscribe<Record<string, unknown>>(evt, (payload) => {
        this.telemetryLog.push({
          eventType: evt,
          payload,
          timestamp: new Date(),
        });
      });
    }
  }

  /**
   * Computes the Charter North Star Metric:
   * Weekly Completed Study Sessions (>= 25 min) per Active Student.
   */
  getNorthStarMetric(
    institutionId?: string,
    referenceNow: Date = new Date()
  ): NorthStarSummary {
    const sevenDaysAgo = new Date(referenceNow.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedSessions = this.studySessionsService
      .listCompletedSessions(institutionId)
      .filter(
        (s) =>
          s.state === SESSION_STATES.COMPLETED &&
          s.endedAt &&
          s.endedAt >= sevenDaysAgo &&
          s.endedAt <= referenceNow &&
          s.plannedDurationMinutes >= COMPLETION.MIN_STREAK_DURATION_MINUTES
      );

    const activeStudentIds = new Set<string>();
    let qualifyingParticipantCompletions = 0;

    for (const session of completedSessions) {
      for (const part of Object.values(session.participants)) {
        activeStudentIds.add(part.userId);
        if (part.completionStatus === 'FULL' || part.completionStatus === 'PARTIAL') {
          qualifyingParticipantCompletions += 1;
        }
      }
    }

    const activeStudentsCount = activeStudentIds.size;
    const weeklyCompletedSessionsPerActiveStudent =
      activeStudentsCount > 0
        ? Number((qualifyingParticipantCompletions / activeStudentsCount).toFixed(2))
        : 0;

    return {
      windowStart: sevenDaysAgo.toISOString(),
      windowEnd: referenceNow.toISOString(),
      activeStudentsCount,
      qualifyingCompletedSessionsCount: completedSessions.length,
      weeklyCompletedSessionsPerActiveStudent,
    };
  }

  getFunnelMetrics(): FunnelMetrics {
    const countEvent = (type: string) =>
      this.telemetryLog.filter((e) => e.eventType === type).length;

    const registeredUsers = countEvent('user.registered');
    const onboardedStudents = countEvent('student.onboarded');
    const invitationsSent = countEvent('invitation.sent');
    const invitationsAccepted = countEvent('invitation.accepted');
    const sessionsStarted = countEvent('session.started');
    const sessionsCompleted = countEvent('session.completed');

    const sessionCompletionRatePercent =
      sessionsStarted > 0
        ? Math.round((sessionsCompleted / sessionsStarted) * 100)
        : 0;

    return {
      registeredUsers,
      onboardedStudents,
      invitationsSent,
      invitationsAccepted,
      sessionsStarted,
      sessionsCompleted,
      sessionCompletionRatePercent,
    };
  }

  listTelemetryEvents(): readonly TelemetryEvent[] {
    return [...this.telemetryLog];
  }
}
