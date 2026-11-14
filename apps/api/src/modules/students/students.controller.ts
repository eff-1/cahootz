import { type AuthenticatedUser } from '../../common/guards/jwt-auth.guard.ts';
import {
  type CompleteOnboardingInput,
  type PublicStudentProfileView,
  type StudentProfileRecord,
  type StudentsService,
  type UpdateProfileInput,
} from './students.service.ts';

export class StudentsController {
  private readonly studentsService: StudentsService;

  constructor(studentsService: StudentsService) {
    this.studentsService = studentsService;
  }

  completeOnboarding(
    user: AuthenticatedUser,
    body: CompleteOnboardingInput
  ): Promise<{ profile: StudentProfileRecord; enrolledCourseIds: string[] }> {
    return this.studentsService.completeOnboarding(user.id, body);
  }

  getMyProfile(user: AuthenticatedUser): {
    profile: StudentProfileRecord;
    courseIds: string[];
  } {
    const profile = this.studentsService.getOwnProfile(user.id);
    const courseIds = this.studentsService.getEnrolledCourseIds(user.id);
    return { profile, courseIds };
  }

  updateMyProfile(
    user: AuthenticatedUser,
    body: UpdateProfileInput
  ): StudentProfileRecord {
    return this.studentsService.updateProfile(user.id, body);
  }

  getProfileById(
    user: AuthenticatedUser,
    targetUserId: string
  ): PublicStudentProfileView {
    return this.studentsService.getProfileForViewer(user.id, targetUserId);
  }

  requestEmailVerification(
    user: AuthenticatedUser,
    body: { institutionalEmail: string }
  ): Promise<{ expiresAt: Date; domainVerifiedMatch: boolean }> {
    return this.studentsService.requestEmailDomainVerification(
      user.id,
      body.institutionalEmail
    );
  }

  confirmEmailVerification(
    user: AuthenticatedUser,
    body: { code: string }
  ): Promise<StudentProfileRecord> {
    return this.studentsService.confirmEmailDomainVerification(user.id, body.code);
  }

  blockUser(
    user: AuthenticatedUser,
    targetUserId: string,
    body?: { reason?: string }
  ) {
    return this.studentsService.blockUser(user.id, targetUserId, body?.reason);
  }

  unblockUser(user: AuthenticatedUser, targetUserId: string) {
    return this.studentsService.unblockUser(user.id, targetUserId);
  }

  listBlocks(user: AuthenticatedUser) {
    return {
      items: this.studentsService.listBlockedUsers(user.id),
    };
  }
}
