import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DomainEventBus } from '../src/common/events/domain-events.ts';
import { InMemoryEmailOutbox } from '../src/modules/notifications/email.provider.ts';
import { PasswordService } from '../src/modules/identity/password.service.ts';
import { TokenService } from '../src/modules/identity/token.service.ts';
import { TotpService } from '../src/modules/identity/totp.service.ts';
import { IdentityService } from '../src/modules/identity/identity.service.ts';
import { InstitutionsService } from '../src/modules/institutions/institutions.service.ts';
import { StudentsService } from '../src/modules/students/students.service.ts';
import { DiscoveryService } from '../src/modules/discovery/discovery.service.ts';
import { WalletService } from '../src/modules/wallet/wallet.service.ts';
import { StudySessionsService } from '../src/modules/study-sessions/study-sessions.service.ts';
import { AnalyticsService } from '../src/modules/analytics/analytics.service.ts';
import { seedPilotInstitution, type PilotSeedResult } from '../src/seed/pilot-seed.ts';

describe('M7 — Closed Pilot Readiness: End-to-End Commitment Loop, North Star Metric, Funnel Telemetry & Operational Docs', () => {
  let eventBus: DomainEventBus;
  let emailOutbox: InMemoryEmailOutbox;
  let identityService: IdentityService;
  let institutionsService: InstitutionsService;
  let studentsService: StudentsService;
  let walletService: WalletService;
  let discoveryService: DiscoveryService;
  let studySessionsService: StudySessionsService;
  let analyticsService: AnalyticsService;
  let seed: PilotSeedResult;

  beforeEach(() => {
    eventBus = new DomainEventBus();
    emailOutbox = new InMemoryEmailOutbox();
    identityService = new IdentityService(
      new PasswordService(),
      new TokenService(),
      new TotpService(),
      eventBus
    );
    institutionsService = new InstitutionsService(eventBus);
    studentsService = new StudentsService(
      identityService,
      institutionsService,
      emailOutbox,
      eventBus
    );
    walletService = new WalletService(eventBus);
    discoveryService = new DiscoveryService(
      studentsService,
      institutionsService,
      eventBus,
      walletService
    );
    studySessionsService = new StudySessionsService(
      studentsService,
      institutionsService,
      walletService,
      eventBus
    );
    analyticsService = new AnalyticsService(eventBus, studySessionsService);
    seed = seedPilotInstitution(institutionsService);
  });

  it('1. proves the complete Charter Principle #5 loop (find partner -> commit -> study together -> complete -> return) and computes North Star & Funnel metrics accurately', async () => {
    const csc301 = seed.courses['CSC 301']!;
    const csc305 = seed.courses['CSC 305']!;

    // 1. Register & onboard two students at Sample University
    const s1 = await identityService.register({
      email: 'faruq.student@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-04-12',
    });
    const s2 = await identityService.register({
      email: 'zainab.student@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-09-18',
    });

    await studentsService.completeOnboarding(s1.userId, {
      institutionId: seed.institutionId,
      levelId: seed.levels['300'],
      courseIds: [csc301, csc305],
      displayName: 'Faruq A.',
      studyGoals: ['Exam Prep'],
    });
    await studentsService.completeOnboarding(s2.userId, {
      institutionId: seed.institutionId,
      levelId: seed.levels['300'],
      courseIds: [csc301, csc305],
      displayName: 'Zainab M.',
      studyGoals: ['Exam Prep'],
    });

    // 2. Zainab broadcasts "Looking to Study Now" and Faruq discovers her
    const day1 = new Date('2026-11-10T17:00:00Z');
    discoveryService.setStudyNowSignal(s2.userId, { courseId: csc301 }, day1);
    const matches = discoveryService.discoverPartners(s1.userId, { studyNowOnly: true }, day1);
    assert.equal(matches.length, 1);
    assert.equal(matches[0]!.userId, s2.userId);

    // 3. Commit: Faruq sends study invitation, Zainab accepts
    const inv1 = await discoveryService.sendInvitation(
      s1.userId,
      {
        recipientId: s2.userId,
        courseId: csc301,
        goal: 'Solve CSC 301 Past Questions (2023)',
        durationMinutes: 30,
      },
      day1
    );
    await discoveryService.acceptInvitation(s2.userId, inv1.id, day1);

    // 4. Study Together Session #1 on Day 1 (30 minutes >= 25 min threshold)
    const session1 = await studySessionsService.createSession(
      s1.userId,
      {
        partnerId: s2.userId,
        courseId: csc301,
        goal: inv1.goal,
        plannedDurationMinutes: 30,
      },
      day1
    );
    await studySessionsService.checkIn(s1.userId, session1.id, {}, day1);
    await studySessionsService.checkIn(s2.userId, session1.id, {}, day1);

    for (let sec = 30; sec <= 1800; sec += 30) {
      const tick = new Date(day1.getTime() + sec * 1000);
      studySessionsService.recordHeartbeat(s1.userId, session1.id, {}, tick);
      studySessionsService.recordHeartbeat(s2.userId, session1.id, {}, tick);
    }
    const day1End = new Date(day1.getTime() + 1800 * 1000);
    await studySessionsService.completeSession(s1.userId, session1.id, {}, day1End);

    // 5. Return on Day 2 for Session #2 (proving retention & multi-day streak!)
    const day2 = new Date('2026-11-11T17:00:00Z');
    const session2 = await studySessionsService.createSession(
      s2.userId,
      {
        partnerId: s1.userId,
        courseId: csc305,
        goal: 'Normalisation & B-Trees review',
        plannedDurationMinutes: 30,
      },
      day2
    );
    await studySessionsService.checkIn(s1.userId, session2.id, {}, day2);
    await studySessionsService.checkIn(s2.userId, session2.id, {}, day2);

    for (let sec = 30; sec <= 1800; sec += 30) {
      const tick = new Date(day2.getTime() + sec * 1000);
      studySessionsService.recordHeartbeat(s1.userId, session2.id, {}, tick);
      studySessionsService.recordHeartbeat(s2.userId, session2.id, {}, tick);
    }
    const day2End = new Date(day2.getTime() + 1800 * 1000);
    await studySessionsService.completeSession(s2.userId, session2.id, {}, day2End);

    // 6. Verify Streaks & XP Ledger
    assert.equal(walletService.getStreak(s1.userId).currentStreakDays, 2);
    assert.equal(walletService.getStreak(s2.userId).currentStreakDays, 2);
    assert.ok(walletService.getXpBalance(s1.userId) > 60);

    // 7. Verify North Star Metric (2 active students, 2 completed sessions >= 25m -> 2.0 sessions per active student)
    const northStar = analyticsService.getNorthStarMetric(seed.institutionId, day2End);
    assert.equal(northStar.activeStudentsCount, 2);
    assert.equal(northStar.qualifyingCompletedSessionsCount, 2);
    assert.equal(northStar.weeklyCompletedSessionsPerActiveStudent, 2);

    // 8. Verify Funnel Metrics
    const funnel = analyticsService.getFunnelMetrics();
    assert.equal(funnel.registeredUsers, 2);
    assert.equal(funnel.onboardedStudents, 2);
    assert.equal(funnel.invitationsSent, 1);
    assert.equal(funnel.invitationsAccepted, 1);
    assert.equal(funnel.sessionsStarted, 2);
    assert.equal(funnel.sessionsCompleted, 2);
    assert.equal(funnel.sessionCompletionRatePercent, 100);
  });

  it('2. verifies all required M0–M7 legal, privacy, moderation, and operational documents exist on disk', () => {
    const requiredDocs = [
      'docs/name-clearance-checklist.md',
      'docs/pilot-protocol.md',
      'docs/privacy-notice-draft.md',
      'docs/terms-of-use-draft.md',
      'docs/community-guidelines.md',
      'docs/moderation-playbook.md',
      'docs/runbook-and-oncall.md',
    ];

    for (const relPath of requiredDocs) {
      const fullPath = join(process.cwd(), relPath);
      assert.equal(existsSync(fullPath), true, `Required document ${relPath} must exist`);
    }
  });
});
