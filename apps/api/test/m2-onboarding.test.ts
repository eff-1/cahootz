import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERROR_CODES,
  VERIFICATION_STATUS,
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
import { seedPilotInstitution, type PilotSeedResult } from '../src/seed/pilot-seed.ts';
import { AppError } from '../src/common/errors/app-error.ts';

describe('M2 — Academic Data, Generic OrgUnit Tree, Onboarding, Verification, and Blocking', () => {
  let eventBus: DomainEventBus;
  let emailOutbox: InMemoryEmailOutbox;
  let identityService: IdentityService;
  let institutionsService: InstitutionsService;
  let studentsService: StudentsService;
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
    seed = seedPilotInstitution(institutionsService);
  });

  it('1. seeds Sample University idempotently with mixed Faculty->Department and College->School org trees', () => {
    // Run seed a second time to verify idempotency
    const secondRun = seedPilotInstitution(institutionsService);
    assert.equal(secondRun.institutionId, seed.institutionId);
    assert.equal(Object.keys(secondRun.courses).length, 10);

    const tree = institutionsService.getOrgUnitTree(seed.institutionId);
    assert.equal(tree.length, 3); // Faculty of Science, Faculty of Engineering, College of Health Sciences

    const scienceNode = tree.find((n) => n.name === 'Faculty of Science');
    const healthNode = tree.find((n) => n.name === 'College of Health Sciences');
    assert.ok(scienceNode, 'Faculty of Science root node should exist');
    assert.ok(healthNode, 'College of Health Sciences root node should exist');
    assert.equal(scienceNode.unitType, 'FACULTY');
    assert.equal(healthNode.unitType, 'COLLEGE');
    assert.equal(scienceNode.children.length, 2);
    assert.equal(scienceNode.children[0]?.unitType, 'DEPARTMENT');
    assert.equal(healthNode.children[0]?.unitType, 'SCHOOL');

    // Hierarchy check `isWithin`
    const csDeptId = seed.orgUnits['Department of Computer Science']!;
    assert.equal(institutionsService.isWithin(csDeptId, scienceNode.id), true);
    assert.equal(institutionsService.isWithin(csDeptId, healthNode.id), false);
  });

  it('2. resolves current academic term and searches official courses and offerings', () => {
    const currentTerm = institutionsService.currentTerm(seed.institutionId);
    assert.ok(currentTerm);
    assert.ok(
      currentTerm.id === seed.termIds.first || currentTerm.id === seed.termIds.second
    );

    const cscCourses = institutionsService.searchCourses(seed.institutionId, {
      query: 'csc',
    });
    assert.equal(cscCourses.length, 6);
  });

  it('3. completes student onboarding with self-declared profile (UNVERIFIED) without blocking core features', async () => {
    const reg = await identityService.register({
      email: 'tunde@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2004-05-12',
    });

    const csc301Id = seed.courses['CSC 301']!;
    const csc305Id = seed.courses['CSC 305']!;

    const result = await studentsService.completeOnboarding(reg.userId, {
      institutionId: seed.institutionId,
      orgUnitId: seed.orgUnits['Department of Computer Science'],
      programmeId: seed.programmes['Computer Science'],
      levelId: seed.levels['300'],
      courseIds: [csc301Id, csc305Id],
      displayName: 'Tunde Bakare',
      bio: 'Preparing for 300L algorithms & OS exams',
      studyGoals: ['Exam Prep', 'Coding Practice'],
      preferredModes: ['POMODORO_25_5', 'DEEP_50_10'],
      availabilityJson: { MON: ['18:00-20:00'], WED: ['19:00-21:00'] },
    });

    assert.equal(result.profile.verificationStatus, VERIFICATION_STATUS.UNVERIFIED);
    assert.equal(result.profile.institutionId, seed.institutionId);
    assert.deepEqual(result.enrolledCourseIds, [csc301Id, csc305Id]);
    assert.ok(result.profile.onboardingCompletedAt);
  });

  it('4. verifies institutional email domain via 6-digit OTP and rejects non-matching domains', async () => {
    const reg = await identityService.register({
      email: 'amina@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-08-20',
    });

    const csc101Id = seed.courses['CSC 101']!;
    await studentsService.completeOnboarding(reg.userId, {
      institutionId: seed.institutionId,
      displayName: 'Amina Yusuf',
      courseIds: [csc101Id],
    });

    // Reject wrong domain
    await assert.rejects(
      async () => {
        await studentsService.requestEmailDomainVerification(
          reg.userId,
          'amina@other-uni.edu.ng'
        );
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.VALIDATION_FAILED
    );

    // Accept @student.sample-university.example
    const otpReq = await studentsService.requestEmailDomainVerification(
      reg.userId,
      'amina@student.sample-university.example'
    );
    assert.equal(otpReq.domainVerifiedMatch, true);

    const otpCode = studentsService.getPendingOtpCodeForTest(reg.userId);
    assert.ok(otpCode && otpCode.length === 6);

    const verifiedProfile = await studentsService.confirmEmailDomainVerification(
      reg.userId,
      otpCode
    );
    assert.equal(
      verifiedProfile.verificationStatus,
      VERIFICATION_STATUS.VERIFIED
    );
    assert.equal(verifiedProfile.institutionalEmail, 'amina@student.sample-university.example');
  });

  it('5. supports "institution not listed" request queue and course proposal auto-materialization after 2 student confirmations', async () => {
    const s1 = await identityService.register({
      email: 's1@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2004-01-10',
    });
    const s2 = await identityService.register({
      email: 's2@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2004-02-10',
    });

    // Institution not listed request
    const instReq = institutionsService.requestInstitution({
      userId: s1.userId,
      name: 'University of Ibadan',
      countryCode: 'NG',
      website: 'https://ui.edu.ng',
    });
    assert.equal(instReq.status, 'PENDING');
    assert.equal(institutionsService.myInstitutionRequests(s1.userId).length, 1);

    // Propose missing course CSC 315 by Student 1
    const p1 = institutionsService.proposeCourse({
      userId: s1.userId,
      institutionId: seed.institutionId,
      orgUnitId: seed.orgUnits['Department of Computer Science'],
      code: 'csc315',
      title: 'Distributed Systems',
    });
    assert.equal(p1.proposal.code, 'CSC 315'); // normalized!
    assert.equal(p1.proposal.proposerIds.length, 1);
    assert.equal(p1.proposal.status, 'PENDING');
    assert.equal(p1.course, null);

    // Second distinct student proposes/confirms same course -> auto-materializes as COMMUNITY
    const p2 = institutionsService.proposeCourse({
      userId: s2.userId,
      institutionId: seed.institutionId,
      orgUnitId: seed.orgUnits['Department of Computer Science'],
      code: 'CSC 315',
      title: 'Distributed Systems',
    });
    assert.equal(p2.proposal.proposerIds.length, 2);
    assert.equal(p2.proposal.status, 'APPROVED');
    assert.ok(p2.course);
    assert.equal(p2.course.provenance, 'COMMUNITY');
    assert.equal(p2.course.code, 'CSC 315');
  });

  it('6. enforces profile visibility, institution boundaries, under-18 restrictions, and symmetric user blocking', async () => {
    const s1 = await identityService.register({
      email: 'student1@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2004-01-10',
    });
    const s2 = await identityService.register({
      email: 'student2@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2004-03-15',
    });
    const minor = await identityService.register({
      email: 'minor17@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2010-06-01', // Under 18
    });

    const csc101Id = seed.courses['CSC 101']!;
    await studentsService.completeOnboarding(s1.userId, {
      institutionId: seed.institutionId,
      displayName: 'Chidi Obi',
      courseIds: [csc101Id],
    });
    await studentsService.completeOnboarding(s2.userId, {
      institutionId: seed.institutionId,
      displayName: 'Ngozi Eze',
      courseIds: [csc101Id],
    });

    // Under-18 cannot set visibility to PUBLIC
    await assert.rejects(
      async () => {
        await studentsService.completeOnboarding(minor.userId, {
          institutionId: seed.institutionId,
          displayName: 'Junior Student',
          courseIds: [csc101Id],
          visibility: VISIBILITY.PUBLIC,
        });
      },
      (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.FORBIDDEN
    );

    // Same institution view works
    const view = studentsService.getProfileForViewer(s1.userId, s2.userId);
    assert.equal(view.displayName, 'Ngozi Eze');

    // Symmetric block hides profile in both directions
    await studentsService.blockUser(s1.userId, s2.userId, 'Unwanted messages');
    assert.equal(studentsService.isBlockedBetween(s1.userId, s2.userId), true);
    assert.equal(studentsService.isBlockedBetween(s2.userId, s1.userId), true);

    assert.throws(
      () => studentsService.getProfileForViewer(s2.userId, s1.userId),
      (err: unknown) => err instanceof AppError && err.httpStatus === 404
    );
    assert.throws(
      () => studentsService.getProfileForViewer(s1.userId, s2.userId),
      (err: unknown) => err instanceof AppError && err.httpStatus === 404
    );
  });
});
