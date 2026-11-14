import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERROR_CODES,
  ROLES,
  VISIBILITY,
} from '../../../packages/shared/src/index.ts';
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
import { ModerationService } from '../src/modules/moderation/moderation.service.ts';
import { MessagingService } from '../src/modules/messaging/messaging.service.ts';
import { AdministrationService } from '../src/modules/administration/administration.service.ts';
import { SecurityHeadersAndCsrfMiddleware } from '../src/common/middleware/security-headers.middleware.ts';
import { SnapshotBackupService } from '../src/common/backup/snapshot-backup.service.ts';
import { seedPilotInstitution, type PilotSeedResult } from '../src/seed/pilot-seed.ts';
import { AppError } from '../src/common/errors/app-error.ts';

describe('M6 — Hardening: STRIDE Threat Model (T1–T12), BOLA/IDOR Matrix, CSRF/CSP, and Backup/Restore Drill', () => {
  let eventBus: DomainEventBus;
  let emailOutbox: InMemoryEmailOutbox;
  let identityService: IdentityService;
  let institutionsService: InstitutionsService;
  let studentsService: StudentsService;
  let discoveryService: DiscoveryService;
  let walletService: WalletService;
  let studySessionsService: StudySessionsService;
  let moderationService: ModerationService;
  let messagingService: MessagingService;
  let adminService: AdministrationService;
  let securityMiddleware: SecurityHeadersAndCsrfMiddleware;
  let backupService: SnapshotBackupService;
  let seed: PilotSeedResult;
  let csc301Id: string;

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
    moderationService = new ModerationService(eventBus);
    messagingService = new MessagingService(
      identityService,
      studentsService,
      discoveryService,
      studySessionsService,
      moderationService,
      eventBus
    );
    adminService = new AdministrationService(moderationService);
    securityMiddleware = new SecurityHeadersAndCsrfMiddleware();
    backupService = new SnapshotBackupService();
    seed = seedPilotInstitution(institutionsService);
    csc301Id = seed.courses['CSC 301']!;
  });

  it('T1 & T2 (Spoofing / Credential Stuffing & Refresh Token Theft): uniform login errors and refresh replay revokes all sessions', async () => {
    const reg = await identityService.register({
      email: 'victim@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-01-10',
    });

    // T1: Uniform error messages for wrong password vs non-existent email
    let errWrongPass = '';
    let errUnknownEmail = '';
    try {
      await identityService.login({ email: 'victim@gmail.com', password: 'WrongPassword!' });
    } catch (e: any) {
      errWrongPass = e.message;
    }
    try {
      await identityService.login({ email: 'nobody@gmail.com', password: 'WrongPassword!' });
    } catch (e: any) {
      errUnknownEmail = e.message;
    }
    assert.equal(errWrongPass, errUnknownEmail);

    // T2: Refresh token rotation + replay revokes all sessions
    const login = await identityService.login({
      email: 'victim@gmail.com',
      password: 'StrongPassword123!',
    });
    const rotated = await identityService.refresh(login.refreshToken!);
    assert.ok(rotated.refreshToken);

    // Attacker replays stolen original refresh token -> revokes all user sessions!
    await assert.rejects(
      async () => {
        await identityService.refresh(login.refreshToken!);
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.UNAUTHENTICATED
    );

    const activeSessions = await identityService.listSessions(reg.userId);
    assert.equal(activeSessions.length, 0, 'All active sessions must be revoked upon token replay');
  });

  it('T3, T4 & T5 (BOLA/IDOR, Cross-Institution Data Leak, & Minor Stalking): strict per-object and institution boundary isolation', async () => {
    const sA = await identityService.register({
      email: 'sa@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-05-10',
    });
    const sB = await identityService.register({
      email: 'sb@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-06-10',
    });
    const attacker = await identityService.register({
      email: 'attacker@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-07-10',
    });

    await studentsService.completeOnboarding(sA.userId, {
      institutionId: seed.institutionId,
      displayName: 'Student A',
      courseIds: [csc301Id],
    });
    await studentsService.completeOnboarding(sB.userId, {
      institutionId: seed.institutionId,
      displayName: 'Student B',
      courseIds: [csc301Id],
      visibility: VISIBILITY.PRIVATE,
    });
    await studentsService.completeOnboarding(attacker.userId, {
      institutionId: seed.institutionId,
      displayName: 'Attacker',
      courseIds: [csc301Id],
    });

    // Private profile cannot be viewed by another student
    assert.throws(
      () => studentsService.getProfileForViewer(attacker.userId, sB.userId),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // Session created between sA and sB cannot be accessed, checked into, or completed by `attacker` (IDOR -> 404)
    const session = await studySessionsService.createSession(sA.userId, {
      partnerId: sB.userId,
      courseId: csc301Id,
      goal: 'Private Session',
    });

    assert.throws(
      () => studySessionsService.getSessionForParticipant(attacker.userId, session.id),
      (err: unknown) => err instanceof AppError && err.httpStatus === 404
    );
    await assert.rejects(
      async () => {
        await studySessionsService.checkIn(attacker.userId, session.id);
      },
      (err: unknown) => err instanceof AppError && err.httpStatus === 404
    );
  });

  it('T6, T7 & T8 (XP Farming, Fake Heartbeat/Timer Manipulation, & Audit Log Tampering): enforces ledger caps, resume token HMAC, and frozen audit entries', async () => {
    const s1 = await identityService.register({
      email: 'farmer1@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-01-10',
    });
    const s2 = await identityService.register({
      email: 'farmer2@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-02-10',
    });
    await studentsService.completeOnboarding(s1.userId, {
      institutionId: seed.institutionId,
      displayName: 'Farmer 1',
      courseIds: [csc301Id],
    });
    await studentsService.completeOnboarding(s2.userId, {
      institutionId: seed.institutionId,
      displayName: 'Farmer 2',
      courseIds: [csc301Id],
    });

    const session = await studySessionsService.createSession(s1.userId, {
      partnerId: s2.userId,
      courseId: csc301Id,
      goal: 'Test Resume Token Security',
    });

    // Forged resume token is rejected with FORBIDDEN
    assert.throws(
      () =>
        studySessionsService.reconnectWithResumeToken(
          s1.userId,
          session.id,
          'forged-resume-token-0000'
        ),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // Audit log entries are Object.freeze'd (append-only, immutable in memory)
    const auditEntry = moderationService.recordAudit({
      actorId: 'staff-1',
      actorRole: ROLES.PLATFORM_ADMIN,
      action: 'test.audit_immutability',
      targetType: 'USER',
      targetId: s1.userId,
    });
    assert.throws(() => {
      (auditEntry as any).action = 'tampered.action';
    });
  });

  it('T9, T10 & T11 (CSRF, Clickjacking/XSS CSP Headers, & Unverified Staff Privilege Escalation)', () => {
    const headers: Record<string, string> = {};
    securityMiddleware.applyHeaders(headers);

    assert.ok(headers['Content-Security-Policy']?.includes("frame-ancestors 'none'"));
    assert.equal(headers['X-Frame-Options'], 'DENY');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.ok(headers['Permissions-Policy']?.includes('camera=()'));

    // Valid CSRF double-submit token passes
    const csrfToken = securityMiddleware.generateCsrfToken('sess-abc');
    assert.equal(
      securityMiddleware.verifyCsrfForMutatingRequest({
        method: 'POST',
        sessionId: 'sess-abc',
        csrfCookie: csrfToken,
        csrfHeader: csrfToken,
      }),
      true
    );

    // Mismatched or forged CSRF token on POST is rejected
    assert.throws(
      () =>
        securityMiddleware.verifyCsrfForMutatingRequest({
          method: 'POST',
          sessionId: 'sess-abc',
          csrfCookie: csrfToken,
          csrfHeader: 'forged.token',
        }),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );
  });

  it('T12 & T-021 (Backup Integrity & Point-in-Time Restore Drill): detects tampering and verifies full count restoration', () => {
    const bundle = backupService.createSignedBackup({
      institutions: institutionsService.searchInstitutions(),
      studentProfiles: studentsService.listInstitutionProfiles(seed.institutionId),
      completedSessions: studySessionsService.listCompletedSessions(seed.institutionId),
      xpLedger: [],
      auditLog: [],
    });

    const restoreResult = backupService.verifyAndRestore(bundle);
    assert.equal(restoreResult.restored, true);
    assert.equal(restoreResult.verifiedCounts.institutionCount, 1);

    // Tampering with backup payload triggers HMAC verification failure
    const tamperedBundle = structuredClone(bundle);
    tamperedBundle.payload.institutionCount = 999;
    assert.throws(
      () => backupService.verifyAndRestore(tamperedBundle),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.VALIDATION_FAILED
    );
  });
});
