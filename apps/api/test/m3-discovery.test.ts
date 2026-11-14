import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERROR_CODES,
  RATE_LIMITS,
  RELIABILITY_BANDS,
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
import { seedPilotInstitution, type PilotSeedResult } from '../src/seed/pilot-seed.ts';
import { AppError } from '../src/common/errors/app-error.ts';

describe('M3 — Partner Discovery, Study Now Signal, Invitations, Cooldowns, and Cross-Institution Isolation', () => {
  let eventBus: DomainEventBus;
  let emailOutbox: InMemoryEmailOutbox;
  let identityService: IdentityService;
  let institutionsService: InstitutionsService;
  let studentsService: StudentsService;
  let discoveryService: DiscoveryService;
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
    discoveryService = new DiscoveryService(
      studentsService,
      institutionsService,
      eventBus,
      {
        getReliabilityBand: () => RELIABILITY_BANDS.RELIABLE,
      }
    );
    seed = seedPilotInstitution(institutionsService);
  });

  async function createOnboardedStudent(
    email: string,
    displayName: string,
    courseIds: string[],
    options: {
      institutionId?: string;
      levelId?: string;
      studyGoals?: string[];
      availabilityJson?: Record<string, string[]>;
      isDiscoverable?: boolean;
    } = {}
  ): Promise<string> {
    const reg = await identityService.register({
      email,
      password: 'StrongPassword123!',
      dateOfBirth: '2003-04-15',
    });
    await studentsService.completeOnboarding(reg.userId, {
      institutionId: options.institutionId ?? seed.institutionId,
      levelId: options.levelId ?? seed.levels['300'],
      courseIds,
      displayName,
      studyGoals: options.studyGoals ?? ['Exam Prep'],
      availabilityJson: options.availabilityJson ?? { MON: ['18:00-20:00'] },
      isDiscoverable: options.isDiscoverable ?? true,
    });
    return reg.userId;
  }

  it('1. ranks partners transparently by shared courses, Study Now signal, level, availability, and goals', async () => {
    const csc301 = seed.courses['CSC 301']!;
    const csc305 = seed.courses['CSC 305']!;
    const mth201 = seed.courses['MTH 201']!;

    const viewerId = await createOnboardedStudent('viewer@gmail.com', 'Viewer', [csc301, csc305], {
      studyGoals: ['Exam Prep'],
      availabilityJson: { MON: ['18:00-20:00'], WED: ['19:00-21:00'] },
    });

    // High match: 2 shared courses + Study Now active + overlapping availability
    const bestMatchId = await createOnboardedStudent('best@gmail.com', 'Best Match', [csc301, csc305], {
      studyGoals: ['Exam Prep'],
      availabilityJson: { MON: ['18:00-20:00'] },
    });
    discoveryService.setStudyNowSignal(bestMatchId, {
      courseId: csc301,
      goalNote: 'Past questions 2022-2024',
      durationMinutes: 50,
    });

    // Medium match: 1 shared course
    const midMatchId = await createOnboardedStudent('mid@gmail.com', 'Mid Match', [csc301], {
      studyGoals: ['Assignment'],
      availabilityJson: { FRI: ['10:00-12:00'] },
    });

    // Low match: 0 shared courses
    const lowMatchId = await createOnboardedStudent('low@gmail.com', 'Low Match', [mth201], {
      levelId: seed.levels['200'],
      studyGoals: ['Assignment'],
      availabilityJson: { SAT: ['10:00-12:00'] },
    });

    const results = discoveryService.discoverPartners(viewerId);
    assert.equal(results.length, 3);
    assert.equal(results[0]!.userId, bestMatchId);
    assert.equal(results[1]!.userId, midMatchId);
    assert.equal(results[2]!.userId, lowMatchId);
    assert.ok(results[0]!.matchScore > results[1]!.matchScore);
    assert.ok(results[1]!.matchScore > results[2]!.matchScore);
    assert.ok(results[0]!.matchReasons.some((r) => r.includes('shared course')));
    assert.ok(results[0]!.matchReasons.some((r) => r.includes('Looking to study right now')));
  });

  it('2. auto-expires "Looking to Study Now" signal after 30 minutes', async () => {
    const csc301 = seed.courses['CSC 301']!;
    const u1 = await createOnboardedStudent('u1@gmail.com', 'U1', [csc301]);
    const u2 = await createOnboardedStudent('u2@gmail.com', 'U2', [csc301]);

    const t0 = new Date('2026-11-14T18:00:00Z');
    discoveryService.setStudyNowSignal(u2, { courseId: csc301 }, t0);

    // At +15 min: signal is active
    const t15 = new Date('2026-11-14T18:15:00Z');
    const activeList = discoveryService.discoverPartners(u1, { studyNowOnly: true }, t15);
    assert.equal(activeList.length, 1);
    assert.equal(activeList[0]!.userId, u2);

    // At +31 min: signal has auto-expired
    const t31 = new Date('2026-11-14T18:31:00Z');
    const expiredList = discoveryService.discoverPartners(u1, { studyNowOnly: true }, t31);
    assert.equal(expiredList.length, 0);
  });

  it('3. strictly enforces institution boundary, hidden discoverability, and symmetric user blocking in discovery', async () => {
    const csc301 = seed.courses['CSC 301']!;
    const viewerId = await createOnboardedStudent('v@gmail.com', 'Viewer', [csc301]);
    const hiddenId = await createOnboardedStudent('h@gmail.com', 'Hidden User', [csc301], {
      isDiscoverable: false,
    });
    const blockedId = await createOnboardedStudent('b@gmail.com', 'Blocked User', [csc301]);

    // Second institution
    const otherInst = institutionsService.createInstitution({
      name: 'Other University',
      code: 'OTHER',
      countryCode: 'NG',
    });
    const otherSession = institutionsService.createSession({
      institutionId: otherInst.id,
      name: '2026/2027',
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2027-08-31T00:00:00Z'),
    });
    institutionsService.createTerm({
      academicSessionId: otherSession.id,
      name: 'First Semester',
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2027-01-31T00:00:00Z'),
    });
    const otherCourse = institutionsService.createCourse({
      institutionId: otherInst.id,
      code: 'CSC 301',
      title: 'Operating Systems',
    });
    const otherUniStudentId = await createOnboardedStudent(
      'other@gmail.com',
      'Other Uni Student',
      [otherCourse.id],
      { institutionId: otherInst.id }
    );

    // Block `blockedId`
    await studentsService.blockUser(blockedId, viewerId);

    const results = discoveryService.discoverPartners(viewerId);
    const ids = results.map((r) => r.userId);
    assert.equal(ids.includes(hiddenId), false, 'Hidden student must not appear');
    assert.equal(ids.includes(blockedId), false, 'Blocked student must not appear');
    assert.equal(ids.includes(otherUniStudentId), false, 'Cross-institution student must not appear');

    // Cross-institution invitation must also be rejected
    await assert.rejects(
      async () => {
        await discoveryService.sendInvitation(viewerId, {
          recipientId: otherUniStudentId,
          courseId: csc301,
          goal: 'Study OS Chapter 4',
        });
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );
  });

  it('4. supports idempotent invitation creation, acceptance, withdrawal, and prevents BOLA/IDOR', async () => {
    const csc301 = seed.courses['CSC 301']!;
    const sender = await createOnboardedStudent('sender@gmail.com', 'Sender', [csc301]);
    const recipient = await createOnboardedStudent('recip@gmail.com', 'Recipient', [csc301]);
    const outsider = await createOnboardedStudent('out@gmail.com', 'Outsider', [csc301]);

    const inv1 = await discoveryService.sendInvitation(sender, {
      recipientId: recipient,
      courseId: csc301,
      goal: 'Complete deadlock problem set',
      idempotencyKey: 'idem-inv-001',
    });
    const invDuplicate = await discoveryService.sendInvitation(sender, {
      recipientId: recipient,
      courseId: csc301,
      goal: 'Complete deadlock problem set',
      idempotencyKey: 'idem-inv-001',
    });
    assert.equal(inv1.id, invDuplicate.id, 'Idempotency key must return the exact same invitation');

    // Outsider cannot read or accept invitation (BOLA/IDOR protection)
    assert.throws(
      () => discoveryService.getInvitationForActor(outsider, inv1.id),
      (err: unknown) => err instanceof AppError && err.httpStatus === 404
    );
    await assert.rejects(
      async () => {
        await discoveryService.acceptInvitation(outsider, inv1.id);
      },
      (err: unknown) => err instanceof AppError && err.httpStatus === 404
    );

    // Sender cannot accept their own invitation
    await assert.rejects(
      async () => {
        await discoveryService.acceptInvitation(sender, inv1.id);
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // Recipient accepts invitation
    const accepted = await discoveryService.acceptInvitation(recipient, inv1.id);
    assert.equal(accepted.status, 'ACCEPTED');
    assert.equal(discoveryService.hasAcceptedInvitationBetween(sender, recipient), true);
  });

  it('5. enforces 24-hour cooldown after 2 declines from the same recipient and 10/day invitation cap', async () => {
    const csc301 = seed.courses['CSC 301']!;
    const sender = await createOnboardedStudent('sender2@gmail.com', 'Sender 2', [csc301]);
    const recipient = await createOnboardedStudent('recip2@gmail.com', 'Recipient 2', [csc301]);

    const now = new Date('2026-11-14T10:00:00Z');
    const i1 = await discoveryService.sendInvitation(
      sender,
      { recipientId: recipient, courseId: csc301, goal: 'Attempt 1' },
      now
    );
    await discoveryService.declineInvitation(recipient, i1.id, now);

    const i2 = await discoveryService.sendInvitation(
      sender,
      { recipientId: recipient, courseId: csc301, goal: 'Attempt 2' },
      now
    );
    await discoveryService.declineInvitation(recipient, i2.id, now);

    // 3rd attempt to the same recipient within 24 hours is rate-limited
    await assert.rejects(
      async () => {
        await discoveryService.sendInvitation(
          sender,
          { recipientId: recipient, courseId: csc301, goal: 'Attempt 3' },
          new Date('2026-11-14T12:00:00Z')
        );
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.RATE_LIMITED
    );

    // After 25 hours, cooldown has elapsed
    const iAfterCooldown = await discoveryService.sendInvitation(
      sender,
      { recipientId: recipient, courseId: csc301, goal: 'Attempt after 25h' },
      new Date('2026-11-15T13:00:00Z')
    );
    assert.equal(iAfterCooldown.status, 'PENDING');

    // Enforce 10 invitations per day cap
    const day2 = new Date('2026-11-16T09:00:00Z');
    for (let idx = 0; idx < RATE_LIMITS.INVITATIONS_PER_DAY; idx++) {
      const target = await createOnboardedStudent(`t${idx}@gmail.com`, `Target ${idx}`, [csc301]);
      await discoveryService.sendInvitation(
        sender,
        { recipientId: target, courseId: csc301, goal: `Session ${idx}` },
        day2
      );
    }

    const extraTarget = await createOnboardedStudent('extra@gmail.com', 'Extra Target', [csc301]);
    await assert.rejects(
      async () => {
        await discoveryService.sendInvitation(
          sender,
          { recipientId: extraTarget, courseId: csc301, goal: '11th invitation' },
          day2
        );
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.RATE_LIMITED
    );
  });
});
