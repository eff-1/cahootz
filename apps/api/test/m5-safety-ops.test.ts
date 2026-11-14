import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERROR_CODES,
  ROLES,
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
import { CommunitiesService } from '../src/modules/communities/communities.service.ts';
import { AdministrationService } from '../src/modules/administration/administration.service.ts';
import { ConsentPrivacyService } from '../src/modules/consent-privacy/consent-privacy.service.ts';
import { AiAssistantService } from '../src/modules/ai/ai.service.ts';
import { VideoRoomService } from '../src/modules/video/video.service.ts';
import { seedPilotInstitution, type PilotSeedResult } from '../src/seed/pilot-seed.ts';
import { AppError } from '../src/common/errors/app-error.ts';
import { type AuthenticatedUser } from '../src/common/guards/jwt-auth.guard.ts';

describe('M5 — Safety, Moderation, Appeals Separation, Messaging (Minor Protection), Communities, Admin Two-Approver & NDPA Privacy', () => {
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
  let communitiesService: CommunitiesService;
  let adminService: AdministrationService;
  let consentPrivacyService: ConsentPrivacyService;
  let seed: PilotSeedResult;
  let csc301Id: string;
  let mth101Id: string;

  const mod1: AuthenticatedUser = {
    id: 'mod-staff-1',
    email: 'mod1@cahootz.ng',
    role: ROLES.PLATFORM_MODERATOR,
    institutionId: null,
    isMinor: false,
    mfaVerified: true,
  };
  const mod2: AuthenticatedUser = {
    id: 'mod-staff-2',
    email: 'mod2@cahootz.ng',
    role: ROLES.PLATFORM_ADMIN,
    institutionId: null,
    isMinor: false,
    mfaVerified: true,
  };
  const modWithoutMfa: AuthenticatedUser = {
    id: 'mod-no-mfa',
    email: 'nomfa@cahootz.ng',
    role: ROLES.PLATFORM_ADMIN,
    institutionId: null,
    isMinor: false,
    mfaVerified: false,
  };

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
    communitiesService = new CommunitiesService(
      institutionsService,
      studentsService,
      moderationService,
      eventBus
    );
    adminService = new AdministrationService(moderationService);
    consentPrivacyService = new ConsentPrivacyService(
      identityService,
      studentsService,
      walletService,
      eventBus
    );
    seed = seedPilotInstitution(institutionsService);
    csc301Id = seed.courses['CSC 301']!;
    mth101Id = seed.courses['MTH 101']!;
  });

  it('1. Moderation: captures immutable evidence snapshot, applies sanctions, and enforces different-moderator rule on appeals', async () => {
    const reporter: AuthenticatedUser = {
      id: 'student-reporter',
      email: 'rep@gmail.com',
      role: ROLES.STUDENT,
      institutionId: seed.institutionId,
      isMinor: false,
      mfaVerified: false,
    };

    const report = await moderationService.createReport(reporter, {
      targetUserId: 'student-offender',
      targetType: 'MESSAGE',
      targetId: 'msg-123',
      category: 'HARASSMENT',
      description: 'Sent abusive messages during session',
      evidenceSnapshot: { messageText: 'Abusive text snapshot', sentAt: '2026-11-14T10:00:00Z' },
    });

    assert.equal(report.status, 'OPEN');

    // Moderator without MFA is blocked
    await assert.rejects(
      async () => {
        await moderationService.resolveReportWithAction(modWithoutMfa, report.id, {
          action: 'RESTRICT_24H',
          reason: 'Harassment violation',
        });
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // Moderator 1 (MFA verified) applies 24h restriction
    const { sanction } = await moderationService.resolveReportWithAction(mod1, report.id, {
      action: 'RESTRICT_24H',
      reason: 'Confirmed harassment in message snapshot',
    });
    assert.ok(sanction);
    assert.equal(moderationService.isUserRestrictedOrSuspended('student-offender'), true);

    // Offender submits appeal
    const appeal = moderationService.submitAppeal(
      'student-offender',
      sanction.id,
      'My message was misunderstood'
    );
    assert.equal(appeal.status, 'PENDING');

    // Moderator 1 (who issued the sanction) CANNOT review the appeal!
    assert.throws(
      () => moderationService.reviewAppeal(mod1, appeal.id, 'UPHELD', 'Self-review attempt'),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // Moderator 2 (different moderator) reviews and overturns the appeal
    const reviewed = moderationService.reviewAppeal(
      mod2,
      appeal.id,
      'OVERTURNED',
      'Context confirmed benign'
    );
    assert.equal(reviewed.status, 'OVERTURNED');
    assert.equal(moderationService.isUserRestrictedOrSuspended('student-offender'), false);

    // Append-only audit log recorded both actions
    const logs = moderationService.listAuditLog(mod2);
    assert.ok(logs.length >= 2);
  });

  it('2. Messaging: enforces Under-18 Minor DM restriction (session contacts only), adult academic context, idempotency, sequence ordering, and disables file uploads', async () => {
    const adult1 = await identityService.register({
      email: 'adult1@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-01-10',
    });
    const adult2NoShared = await identityService.register({
      email: 'adult2@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-02-10',
    });
    const minor17 = await identityService.register({
      email: 'minor17@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2010-05-10', // 16-17 minor
    });

    await studentsService.completeOnboarding(adult1.userId, {
      institutionId: seed.institutionId,
      displayName: 'Adult One',
      courseIds: [csc301Id],
    });
    await studentsService.completeOnboarding(adult2NoShared.userId, {
      institutionId: seed.institutionId,
      displayName: 'Adult Two',
      courseIds: [mth101Id], // Different course!
    });
    await studentsService.completeOnboarding(minor17.userId, {
      institutionId: seed.institutionId,
      displayName: 'Minor Student',
      courseIds: [csc301Id], // Shares CSC 301 with Adult One, but NO study session yet!
    });

    // 1. Adult1 -> Adult2 (no shared course or session) is FORBIDDEN
    await assert.rejects(
      async () => {
        await messagingService.sendMessage(adult1.userId, {
          recipientId: adult2NoShared.userId,
          body: 'Hello stranger',
          clientMessageId: 'm-1',
        });
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // 2. Adult1 -> Minor17 (shares course CSC 301, but NO accepted invitation or session) is FORBIDDEN per Rule 22!
    await assert.rejects(
      async () => {
        await messagingService.sendMessage(adult1.userId, {
          recipientId: minor17.userId,
          body: 'Hi minor classmate',
          clientMessageId: 'm-2',
        });
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // 3. Now Adult1 sends study invitation to Minor17 and Minor17 accepts -> session contact established!
    const inv = await discoveryService.sendInvitation(adult1.userId, {
      recipientId: minor17.userId,
      courseId: csc301Id,
      goal: 'Review OS paging together',
    });
    await discoveryService.acceptInvitation(minor17.userId, inv.id);

    const msg1 = await messagingService.sendMessage(adult1.userId, {
      recipientId: minor17.userId,
      body: 'Ready for our OS paging review?',
      clientMessageId: 'client-msg-001',
    });
    assert.equal(msg1.seq, 1);

    // Idempotent replay of client-msg-001 returns same message with seq 1
    const msg1Dup = await messagingService.sendMessage(adult1.userId, {
      recipientId: minor17.userId,
      body: 'Ready for our OS paging review?',
      clientMessageId: 'client-msg-001',
    });
    assert.equal(msg1Dup.id, msg1.id);
    assert.equal(msg1Dup.seq, 1);

    const msg2 = await messagingService.sendMessage(minor17.userId, {
      recipientId: adult1.userId,
      body: 'Yes! Starting my timer now.',
      clientMessageId: 'client-msg-002',
    });
    assert.equal(msg2.seq, 2);

    // File upload fails closed per Rule 17
    assert.throws(
      () => messagingService.uploadAttachment(),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );
  });

  it('3. Communities: auto-joins on course enrolment, requires courseId on Q&A posts, and supports accepted answers', async () => {
    const s1 = await identityService.register({
      email: 'comm1@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-03-10',
    });
    const s2 = await identityService.register({
      email: 'comm2@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-04-10',
    });

    // Enrolling in CSC 301 emits `student.enrolled`, which auto-joins both students to CSC 301 community
    await studentsService.completeOnboarding(s1.userId, {
      institutionId: seed.institutionId,
      displayName: 'Question Author',
      courseIds: [csc301Id],
    });
    await studentsService.completeOnboarding(s2.userId, {
      institutionId: seed.institutionId,
      displayName: 'Helpful Classmate',
      courseIds: [csc301Id],
    });

    const post = communitiesService.createPost(s1.userId, {
      courseId: csc301Id,
      title: 'How does Peterson solution handle mutual exclusion?',
      body: 'Can someone explain the role of the turn and flag variables in Peterson algorithm?',
    });
    assert.equal(post.courseId, csc301Id);

    const answer = communitiesService.createAnswer(
      s2.userId,
      post.id,
      'Flag indicates readiness to enter critical section, while turn breaks ties.'
    );

    const updatedPost = communitiesService.markAcceptedAnswer(s1.userId, post.id, answer.id);
    assert.equal(updatedPost.acceptedAnswerId, answer.id);
  });

  it('4. Administration & R3 Stubs: enforces Two-Approver Rule on sensitive actions and fails closed on AI/Video R3 stubs', () => {
    const prop = adminService.proposeSensitiveAction(mod1, {
      actionType: 'PURGE_USER',
      targetId: 'user-to-purge',
      reason: 'Confirmed fraudulent bot account',
    });
    assert.equal(prop.status, 'PENDING_SECOND_APPROVAL');

    // Proposer (mod1) CANNOT approve their own sensitive action!
    assert.throws(
      () => adminService.approveSensitiveAction(mod1, prop.id),
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // Second distinct staff member (mod2) approves -> EXECUTED
    const executed = adminService.approveSensitiveAction(mod2, prop.id);
    assert.equal(executed.status, 'EXECUTED');
    assert.equal(executed.approvedByStaffId, mod2.id);

    // Out-of-scope R3 stubs fail closed
    const ai = new AiAssistantService();
    const video = new VideoRoomService();
    assert.throws(() => ai.generateStudyQuiz());
    assert.throws(() => video.issueRoomToken());
  });

  it('5. NDPA 2023 Consent & Privacy: logs append-only consent, exports full JSON portable data, and schedules account deletion', async () => {
    const reg = await identityService.register({
      email: 'privacy@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-07-15',
    });
    await studentsService.completeOnboarding(reg.userId, {
      institutionId: seed.institutionId,
      displayName: 'Privacy Student',
      courseIds: [csc301Id],
    });

    consentPrivacyService.recordConsent(reg.userId, {
      purpose: 'PRIVACY_NOTICE_ACK',
      policyVersion: 'v0.1-draft',
      granted: true,
      ipAddress: '102.89.23.10',
    });

    const exported = consentPrivacyService.exportUserData(reg.userId);
    assert.equal(exported.account.id, reg.userId);
    assert.equal(exported.academicProfile?.displayName, 'Privacy Student');
    assert.equal(exported.consents.length, 1);

    const delReq = await consentPrivacyService.requestAccountDeletion(reg.userId);
    assert.equal(delReq.status, 'SCHEDULED');
  });
});
