import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERROR_CODES,
  PING_OUTCOMES,
  RELIABILITY_BANDS,
  ROLES,
  SESSION_STATES,
  XP,
} from '../../../packages/shared/src/index.ts';
import { DomainEventBus } from '../src/common/events/domain-events.ts';
import { InMemoryEmailOutbox } from '../src/modules/notifications/email.provider.ts';
import { PasswordService } from '../src/modules/identity/password.service.ts';
import { TokenService } from '../src/modules/identity/token.service.ts';
import { TotpService } from '../src/modules/identity/totp.service.ts';
import { IdentityService } from '../src/modules/identity/identity.service.ts';
import { InstitutionsService } from '../src/modules/institutions/institutions.service.ts';
import { StudentsService } from '../src/modules/students/students.service.ts';
import { WalletService } from '../src/modules/wallet/wallet.service.ts';
import { StudySessionsService } from '../src/modules/study-sessions/study-sessions.service.ts';
import { seedPilotInstitution, type PilotSeedResult } from '../src/seed/pilot-seed.ts';
import { AppError } from '../src/common/errors/app-error.ts';

describe('M4 — Study Together State Machine, Fairness Reconnect, Server Timer, Pings, XP Ledger, Streaks, Reliability & Disputes', () => {
  let eventBus: DomainEventBus;
  let emailOutbox: InMemoryEmailOutbox;
  let identityService: IdentityService;
  let institutionsService: InstitutionsService;
  let studentsService: StudentsService;
  let walletService: WalletService;
  let studySessionsService: StudySessionsService;
  let seed: PilotSeedResult;
  let hostId: string;
  let partnerId: string;
  let csc301Id: string;

  beforeEach(async () => {
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
    studySessionsService = new StudySessionsService(
      studentsService,
      institutionsService,
      walletService,
      eventBus
    );
    seed = seedPilotInstitution(institutionsService);
    csc301Id = seed.courses['CSC 301']!;

    const r1 = await identityService.register({
      email: 'host@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-02-10',
    });
    const r2 = await identityService.register({
      email: 'partner@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-06-20',
    });
    hostId = r1.userId;
    partnerId = r2.userId;

    await studentsService.completeOnboarding(hostId, {
      institutionId: seed.institutionId,
      displayName: 'Host Student',
      courseIds: [csc301Id],
    });
    await studentsService.completeOnboarding(partnerId, {
      institutionId: seed.institutionId,
      displayName: 'Partner Student',
      courseIds: [csc301Id],
    });
  });

  it('1. enforces state transition table, optimistic concurrency versions, and monotonic append-only session_events', async () => {
    const t0 = new Date('2026-11-14T10:00:00Z');
    const session = await studySessionsService.createSession(
      hostId,
      {
        partnerId,
        courseId: csc301Id,
        goal: 'OS Memory Management',
        plannedDurationMinutes: 30,
        idempotencyKey: 'sess-idem-1',
      },
      t0
    );
    assert.equal(session.state, SESSION_STATES.SCHEDULED);
    assert.equal(session.version, 1);

    // Illegal transition from SCHEDULED directly to COMPLETED must fail and be logged
    await assert.rejects(
      async () => {
        await studySessionsService.completeSession(hostId, session.id, {}, t0);
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.INVALID_STATE
    );
    const rejected = studySessionsService.getRejectedTransitions(session.id);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0]!.attemptedFrom, SESSION_STATES.SCHEDULED);
    assert.equal(rejected[0]!.attemptedTo, SESSION_STATES.COMPLETED);

    // Host checks in -> state transitions to READY (version 2)
    await studySessionsService.checkIn(hostId, session.id, { expectedVersion: 1 }, t0);
    assert.equal(session.state, SESSION_STATES.READY);
    assert.equal(session.version, 2);

    // Optimistic concurrency mismatch (stale expectedVersion: 1) must throw CONFLICT
    await assert.rejects(
      async () => {
        await studySessionsService.checkIn(partnerId, session.id, { expectedVersion: 1 }, t0);
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.CONFLICT
    );

    // Partner checks in with correct version -> state transitions to ACTIVE (version 3)
    await studySessionsService.checkIn(partnerId, session.id, { expectedVersion: 2 }, t0);
    assert.equal(session.state, SESSION_STATES.ACTIVE);
    assert.equal(session.version, 3);

    // Verify monotonic sequence numbers in session_events
    const events = studySessionsService.getSessionEvents(hostId, session.id);
    assert.deepEqual(
      events.map((e) => e.seq),
      [1, 2, 3]
    );
  });

  it('2. maintains <1s server-authoritative timer accuracy across two clients even with client clock skew and pauses', async () => {
    const t0 = new Date('2026-11-14T10:00:00Z');
    const session = await studySessionsService.createSession(
      hostId,
      {
        partnerId,
        courseId: csc301Id,
        goal: 'Timer Accuracy Test',
        plannedDurationMinutes: 50,
      },
      t0
    );

    await studySessionsService.checkIn(hostId, session.id, {}, t0);
    await studySessionsService.checkIn(partnerId, session.id, {}, t0);

    // At +10 minutes, pause session for 2 minutes
    const t10m = new Date('2026-11-14T10:10:00Z');
    studySessionsService.pauseSession(hostId, session.id, { reason: 'Water break' }, t10m);
    assert.equal(session.state, SESSION_STATES.PAUSED);

    const t12m = new Date('2026-11-14T10:12:00Z');
    studySessionsService.resumeSession(partnerId, session.id, {}, t12m);
    assert.equal(session.state, SESSION_STATES.ACTIVE);
    assert.equal(session.pausedDurationSeconds, 120);

    // At +22 minutes wall time (20 minutes active time, 2 minutes paused):
    // Client A's clock is 45 seconds fast; Client B's clock is 30 seconds slow.
    const serverNow = new Date('2026-11-14T10:22:00Z');
    const clientANow = new Date('2026-11-14T10:22:45Z');
    const clientBNow = new Date('2026-11-14T10:21:30Z');

    const snapA = studySessionsService.getTimerSnapshot(hostId, session.id, serverNow, clientANow);
    const snapB = studySessionsService.getTimerSnapshot(partnerId, session.id, serverNow, clientBNow);

    assert.equal(snapA.elapsedActiveSeconds, 20 * 60);
    assert.equal(snapA.remainingSeconds, 30 * 60);
    assert.equal(snapB.remainingSeconds, 30 * 60);
    assert.equal(Math.abs(snapA.remainingSeconds - snapB.remainingSeconds), 0);
    assert.equal(snapA.clientClockSkewMs, 45_000);
    assert.equal(snapB.clientClockSkewMs, -30_000);
  });

  it('3. FAIRNESS CRITICAL (7.18): a 3-minute forced network disconnect + missed ping during outage + reconnect completes with NO penalty', async () => {
    const t0 = new Date('2026-11-14T14:00:00Z');
    const session = await studySessionsService.createSession(
      hostId,
      {
        partnerId,
        courseId: csc301Id,
        goal: 'Fairness Under Nigerian Network Drop',
        plannedDurationMinutes: 30, // 1800 seconds
      },
      t0
    );

    await studySessionsService.checkIn(hostId, session.id, {}, t0);
    await studySessionsService.checkIn(partnerId, session.id, {}, t0);

    // Both study with healthy heartbeats for 15 minutes (900s)
    for (let m = 1; m <= 15; m++) {
      const tick = new Date(t0.getTime() + m * 30 * 1000);
      studySessionsService.recordHeartbeat(hostId, session.id, { visibility: 'VISIBLE' }, tick);
      studySessionsService.recordHeartbeat(partnerId, session.id, { visibility: 'VISIBLE' }, tick);
    }

    // At 7.5m (450s), partner experiences a 3-minute (180s) power/network cut!
    const tDisconnect = new Date(t0.getTime() + 450 * 1000);
    studySessionsService.reportNetworkDisconnect(partnerId, session.id, tDisconnect);

    // While partner is disconnected (at 480s), host sends an accountability ping!
    const tPing = new Date(t0.getTime() + 480 * 1000);
    const ping = studySessionsService.sendAccountabilityPing(
      hostId,
      session.id,
      { idempotencyKey: 'ping-during-outage' },
      tPing
    );

    // Partner reconnects 3 minutes (180s) after disconnect (at 630s — within 5-min grace!)
    const tReconnect = new Date(t0.getTime() + 630 * 1000);
    const resumeToken = session.participants[partnerId]!.resumeToken;
    const reconnected = studySessionsService.reconnectWithResumeToken(
      partnerId,
      session.id,
      resumeToken,
      tReconnect
    );
    assert.equal(reconnected.excusedDisconnectSeconds, 180);

    // Study remaining time up to 30 minutes (1800s) in 30s heartbeat steps
    for (let sec = 660; sec <= 1800; sec += 30) {
      const tick = new Date(t0.getTime() + sec * 1000);
      studySessionsService.recordHeartbeat(hostId, session.id, { visibility: 'VISIBLE' }, tick);
      studySessionsService.recordHeartbeat(partnerId, session.id, { visibility: 'VISIBLE' }, tick);
    }

    // Complete session at 30 minutes
    const tEnd = new Date(t0.getTime() + 1800 * 1000);
    const completed = await studySessionsService.completeSession(hostId, session.id, {}, tEnd);

    // Ping sent while partner was disconnected MUST be classified as MISSED_DISCONNECTED (no penalty!)
    assert.equal(ping.outcome, PING_OUTCOMES.MISSED_DISCONNECTED);

    const partnerPart = completed.participants[partnerId]!;
    assert.equal(partnerPart.missedConnectedPings, 0);
    assert.equal(partnerPart.missedDisconnectedPings, 1);
    assert.equal(partnerPart.completionStatus, 'FULL');
    assert.ok(partnerPart.xpAwarded > 0, 'Partner must receive full XP');

    const reliability = walletService.getReliability(partnerId);
    assert.equal(reliability.score, 100, 'Partner reliability score must remain 100%');
  });

  it('4. handles duplicate clientEventId idempotently and ignores out-of-order client heartbeats safely', async () => {
    const t0 = new Date('2026-11-14T16:00:00Z');
    const session = await studySessionsService.createSession(
      hostId,
      {
        partnerId,
        courseId: csc301Id,
        goal: 'Idempotency & Ordering Test',
        plannedDurationMinutes: 30,
      },
      t0
    );
    await studySessionsService.checkIn(hostId, session.id, {}, t0);
    await studySessionsService.checkIn(partnerId, session.id, {}, t0);

    const t30s = new Date(t0.getTime() + 30_000);
    studySessionsService.recordHeartbeat(
      hostId,
      session.id,
      { clientEventId: 'hb-001', clientSeq: 2, clientTimestamp: t30s },
      t30s
    );
    const connectedAfterFirst = session.participants[hostId]!.connectedSeconds;
    assert.equal(connectedAfterFirst, 30);

    // Replay exact same clientEventId -> no double counting!
    studySessionsService.recordHeartbeat(
      hostId,
      session.id,
      { clientEventId: 'hb-001', clientSeq: 2, clientTimestamp: t30s },
      new Date(t0.getTime() + 45_000)
    );
    assert.equal(session.participants[hostId]!.connectedSeconds, 30);

    // Out-of-order older clientTimestamp arriving at same server tick -> logged & ignored
    studySessionsService.recordHeartbeat(
      hostId,
      session.id,
      {
        clientEventId: 'hb-stale',
        clientSeq: 1,
        clientTimestamp: new Date(t0.getTime() + 10_000),
      },
      t30s
    );
    const events = studySessionsService.getSessionEvents(hostId, session.id);
    assert.ok(events.some((e) => e.eventType === 'heartbeat.out_of_order_ignored'));
  });

  it('5. enforces append-only XP ledger rules (idempotency, same-pair diminishing returns, 500 daily cap, coin purchase blocked), Africa/Lagos streak freeze, and 4 reliability bands', async () => {
    // 1. Coin purchase and transfer fail closed
    assert.throws(
      () => walletService.purchaseCoins(),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );
    assert.throws(
      () => walletService.transferCoins(),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // 2. Award XP for same pair twice on Day 1 -> second session receives 0.5x diminishing returns
    const day1 = new Date('2026-11-10T10:00:00Z');
    const s1 = await walletService.awardSessionXp({
      userId: hostId,
      sessionId: 'sess-1',
      partnerId,
      durationMinutes: 50,
      completionType: 'FULL',
      now: day1,
    });
    assert.equal(s1.entry.amount, 50);

    // Idempotent replay of sess-1
    const s1Dup = await walletService.awardSessionXp({
      userId: hostId,
      sessionId: 'sess-1',
      partnerId,
      durationMinutes: 50,
      completionType: 'FULL',
      now: day1,
    });
    assert.equal(s1Dup.entry.id, s1.entry.id);
    assert.equal(walletService.getXpBalance(hostId), 50);

    // Second session with same partner on same Lagos day -> 0.5x = 25 XP
    const s2 = await walletService.awardSessionXp({
      userId: hostId,
      sessionId: 'sess-2',
      partnerId,
      durationMinutes: 50,
      completionType: 'FULL',
      now: day1,
    });
    assert.equal(s2.entry.amount, 25);

    // 3. Streak freeze across missed Day 2 (active Day 1, skip Day 2, active Day 3 -> 1 freeze used, streak = 2!)
    const day3 = new Date('2026-11-12T10:00:00Z'); // 2 calendar days after 2026-11-10
    const s3 = await walletService.awardSessionXp({
      userId: hostId,
      sessionId: 'sess-3',
      partnerId,
      durationMinutes: 50,
      completionType: 'FULL',
      now: day3,
    });
    assert.equal(s3.streak.currentStreakDays, 2);
    assert.equal(s3.streak.freezesUsedInPeriod, 1);

    // 4. Reliability bands transition: New (<3 sessions) -> Very Reliable (>=90% after 3 full completions)
    assert.equal(walletService.getReliabilityBand(hostId), RELIABILITY_BANDS.NEW);
    walletService.recordSessionReliabilityOutcome(hostId, 'FULL_COMPLETE', day1);
    walletService.recordSessionReliabilityOutcome(hostId, 'FULL_COMPLETE', day1);
    assert.equal(walletService.getReliabilityBand(hostId), RELIABILITY_BANDS.NEW); // still 2 sessions
    walletService.recordSessionReliabilityOutcome(hostId, 'FULL_COMPLETE', day3);
    assert.equal(walletService.getReliabilityBand(hostId), RELIABILITY_BANDS.VERY_RELIABLE);

    // 5. Daily XP cap (500 XP max in a single day)
    const day4 = new Date('2026-11-13T10:00:00Z');
    for (let i = 0; i < 15; i++) {
      await walletService.awardSessionXp({
        userId: partnerId,
        sessionId: `cap-sess-${i}`,
        partnerId: `distinct-partner-${i}`,
        durationMinutes: 100, // 100 XP each
        completionType: 'FULL',
        now: day4,
      });
    }
    assert.equal(walletService.getEarnedXpForDate(partnerId, '2026-11-13'), XP.DAILY_CAP);
  });

  it('6. auto-resolves disputes within 24h window when disconnect log evidence exists, and rejects disputes after 24h', async () => {
    const t0 = new Date('2026-11-14T08:00:00Z');
    const session = await studySessionsService.createSession(
      hostId,
      {
        partnerId,
        courseId: csc301Id,
        goal: 'Dispute Resolution Test',
        plannedDurationMinutes: 30,
      },
      t0
    );
    await studySessionsService.checkIn(hostId, session.id, {}, t0);
    await studySessionsService.checkIn(partnerId, session.id, {}, t0);

    // Partner disconnects due to power outage, session is abandoned at +20m
    const t10m = new Date(t0.getTime() + 10 * 60 * 1000);
    studySessionsService.reportNetworkDisconnect(partnerId, session.id, t10m);

    const t20m = new Date(t0.getTime() + 20 * 60 * 1000);
    await studySessionsService.abandonSession(hostId, session.id, 'Partner power outage', t20m);
    assert.equal(session.state, SESSION_STATES.ABANDONED);

    // Filing dispute 25 hours later (> 24h window per D-013) is rejected
    const t25h = new Date(t20m.getTime() + 25 * 60 * 60 * 1000);
    await assert.rejects(
      async () => {
        await studySessionsService.fileDispute(partnerId, session.id, 'Power cut in hostel', t25h);
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.VALIDATION_FAILED
    );

    // Filing dispute 2 hours after session end succeeds and auto-resolves because disconnect event is in log!
    const t2h = new Date(t20m.getTime() + 2 * 60 * 60 * 1000);
    const dispute = await studySessionsService.fileDispute(
      partnerId,
      session.id,
      'NEPA power cut during session',
      t2h
    );
    assert.equal(dispute.status, 'AUTO_RESOLVED_APPROVED');
    assert.equal(session.state, SESSION_STATES.COMPLETED);
    assert.equal(session.participants[partnerId]!.completionStatus, 'FULL');
    assert.ok(session.participants[partnerId]!.xpAwarded > 0);
  });
});

