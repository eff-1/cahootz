import { type AuthenticatedUser } from '../../common/guards/jwt-auth.guard.ts';
import { Policy } from '../../common/policy/policy.ts';
import {
  type CourseEntity,
  type CourseProposalEntity,
  type InstitutionRequestEntity,
  type InstitutionsService,
} from './institutions.service.ts';

export class InstitutionsController {
  private readonly institutionsService: InstitutionsService;

  constructor(institutionsService: InstitutionsService) {
    this.institutionsService = institutionsService;
  }

  listInstitutions(query?: string, countryCode?: string) {
    return {
      items: this.institutionsService.searchInstitutions(query, countryCode),
    };
  }

  getInstitutionStructure(institutionId: string) {
    const institution = this.institutionsService.getInstitution(institutionId);
    const orgTree = this.institutionsService.getOrgUnitTree(institutionId);
    const programmes = this.institutionsService.listProgrammes(institutionId);
    const levels = this.institutionsService.listLevels(institutionId);
    const currentTerm = this.institutionsService.currentTerm(institutionId);
    const courses = this.institutionsService.searchCourses(institutionId);

    return {
      institution,
      orgTree,
      programmes,
      levels,
      currentTerm,
      courses,
    };
  }

  requestMissingInstitution(
    user: AuthenticatedUser,
    body: {
      institutionName: string;
      countryCode?: string;
      websiteUrl?: string;
      note?: string;
    }
  ): InstitutionRequestEntity {
    return this.institutionsService.requestInstitution({
      userId: user.id,
      name: body.institutionName,
      countryCode: body.countryCode,
      website: body.websiteUrl,
      note: body.note,
    });
  }

  proposeMissingCourse(
    user: AuthenticatedUser,
    body: {
      institutionId: string;
      orgUnitId?: string;
      code: string;
      title: string;
    }
  ): { proposal: CourseProposalEntity; course: CourseEntity | null } {
    Policy.assertSameInstitution(user, body.institutionId);
    return this.institutionsService.proposeCourse({
      userId: user.id,
      institutionId: body.institutionId,
      orgUnitId: body.orgUnitId,
      code: body.code,
      title: body.title,
    });
  }

  reviewCourseProposal(
    user: AuthenticatedUser,
    proposalId: string,
    decision: 'APPROVED' | 'REJECTED'
  ): { proposal: CourseProposalEntity; course: CourseEntity | null } {
    Policy.assertStaffWithMfa(user);
    return this.institutionsService.reviewCourseProposal(
      {
        userId: user.id,
        roles: [user.role],
        institutionId: user.institutionId,
      },
      proposalId,
      decision
    );
  }
}
