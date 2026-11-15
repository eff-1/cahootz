import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type Actor, canReviewAcademicData } from '../../common/policy/policy.ts';
import {
  uuidv7,
  COURSE_PROPOSAL_CONFIRMATIONS,
} from '../../../../../packages/shared/src/index.ts';

/**
 * Institutions module.
 *
 * Owns: institutions, org-unit tree, programmes, level schemes, academic
 * sessions/terms, course catalogue, course offerings, institution requests and
 * course proposals. Other modules call this public service; they never read
 * these records directly.
 *
 * Structure is deliberately generic (D-009): faculties, schools, colleges,
 * departments and centres are all OrgUnits with a unit type and a parent,
 * because Nigerian institutions do not share one structure.
 */

export type OrgUnitType = 'FACULTY' | 'SCHOOL' | 'COLLEGE' | 'DEPARTMENT' | 'CENTRE';
export const ORG_UNIT_TYPES: readonly OrgUnitType[] = [
  'FACULTY',
  'SCHOOL',
  'COLLEGE',
  'DEPARTMENT',
  'CENTRE',
];

/** Where a record came from. OFFICIAL = institution-supplied; CURATED = admin-entered/reviewed; COMMUNITY = student-proposed. */
export type Provenance = 'OFFICIAL' | 'CURATED' | 'COMMUNITY';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface InstitutionEntity {
  id: string;
  name: string;
  code: string;
  countryCode: string;
  website: string | null;
  /** Email domains issued to students; used for EMAIL_DOMAIN verification. */
  emailDomains: string[];
  /** True for placeholder/sample data that must never be presented as real. */
  isSample: boolean;
  aliases: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgUnitEntity {
  id: string;
  institutionId: string;
  parentId: string | null;
  name: string;
  unitType: OrgUnitType;
  createdAt: Date;
}

export interface ProgrammeEntity {
  id: string;
  institutionId: string;
  orgUnitId: string;
  name: string;
  degreeType: string;
}

export interface AcademicLevelEntity {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  rank: number;
}

export interface AcademicSessionEntity {
  id: string;
  institutionId: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface TermEntity {
  id: string;
  institutionId: string;
  academicSessionId: string;
  name: string;
  termType: string;
  startDate: Date;
  endDate: Date;
}

export interface CourseEntity {
  id: string;
  institutionId: string;
  orgUnitId: string | null;
  code: string;
  title: string;
  credits: number;
  description: string | null;
  provenance: Provenance;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface CourseOfferingEntity {
  id: string;
  institutionId: string;
  courseId: string;
  termId: string;
  academicLevelId: string | null;
}

export interface InstitutionRequestEntity {
  id: string;
  userId: string;
  name: string;
  countryCode: string;
  website: string | null;
  note: string | null;
  status: RequestStatus;
  reviewedBy: string | null;
  createdAt: Date;
}

export interface CourseProposalEntity {
  id: string;
  institutionId: string;
  code: string;
  title: string;
  orgUnitId: string | null;
  /** Distinct students who proposed/confirmed this course. */
  proposerIds: string[];
  status: RequestStatus;
  /** Set once the course exists in the catalogue. */
  courseId: string | null;
  reviewedBy: string | null;
  createdAt: Date;
}

function normaliseCode(code: string): string {
  // "csc301", "CSC 301", "csc-301" -> "CSC 301"
  const compact = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = compact.match(/^([A-Z]+)(\d+[A-Z]?)$/);
  return match ? `${match[1]} ${match[2]}` : compact;
}

function normaliseDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@/, '');
}

export class InstitutionsService {
  private readonly institutions = new Map<string, InstitutionEntity>();
  private readonly orgUnits = new Map<string, OrgUnitEntity>();
  private readonly programmes = new Map<string, ProgrammeEntity>();
  private readonly levels = new Map<string, AcademicLevelEntity>();
  private readonly sessions = new Map<string, AcademicSessionEntity>();
  private readonly terms = new Map<string, TermEntity>();
  private readonly courses = new Map<string, CourseEntity>();
  private readonly offerings = new Map<string, CourseOfferingEntity>();
  private readonly institutionRequests = new Map<string, InstitutionRequestEntity>();
  private readonly courseProposals = new Map<string, CourseProposalEntity>();
  private readonly events: DomainEventBus | null;

  constructor(events?: DomainEventBus) {
    this.events = events || null;
  }

  // ─── Institutions ────────────────────────────────────────────────

  createInstitution(data: {
    id?: string;
    name: string;
    code: string;
    countryCode?: string;
    website?: string | null;
    emailDomains?: readonly string[];
    isSample?: boolean;
    aliases?: readonly string[];
  }): InstitutionEntity {
    const code = data.code.trim().toUpperCase();
    const countryCode = (data.countryCode || 'NG').toUpperCase();
    for (const existing of this.institutions.values()) {
      if (existing.code === code && existing.countryCode === countryCode) {
        throw AppError.conflict(`Institution code ${code} already exists in ${countryCode}`);
      }
    }
    const entity: InstitutionEntity = {
      id: data.id || uuidv7(),
      name: data.name.trim(),
      code,
      countryCode,
      website: data.website || null,
      emailDomains: (data.emailDomains || []).map(normaliseDomain),
      isSample: data.isSample ?? false,
      aliases: [...(data.aliases || [])],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.institutions.set(entity.id, entity);
    return entity;
  }

  getInstitution(id: string): InstitutionEntity {
    const inst = this.institutions.get(id);
    if (!inst) throw AppError.notFound('Institution not found');
    return inst;
  }

  findInstitution(id: string): InstitutionEntity | null {
    return this.institutions.get(id) || null;
  }

  /** Search by name, code or alias (e.g. "LAUTECH"). */
  searchInstitutions(query?: string, countryCode?: string): InstitutionEntity[] {
    const q = (query || '').trim().toLowerCase();
    return Array.from(this.institutions.values())
      .filter((i) => !countryCode || i.countryCode === countryCode.toUpperCase())
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          i.aliases.some((a) => a.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Returns the institution whose student email domain matches, if any. */
  institutionForEmail(email: string): InstitutionEntity | null {
    const domain = normaliseDomain(email.split('@')[1] || '');
    if (!domain) return null;
    for (const inst of this.institutions.values()) {
      if (inst.emailDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
        return inst;
      }
    }
    return null;
  }

  emailMatchesInstitution(email: string, institutionId: string): boolean {
    const inst = this.institutionForEmail(email);
    return inst !== null && inst.id === institutionId;
  }

  // ─── Org-unit tree ───────────────────────────────────────────────

  createOrgUnit(data: {
    institutionId: string;
    parentId?: string | null;
    name: string;
    unitType: OrgUnitType;
  }): OrgUnitEntity {
    this.getInstitution(data.institutionId);
    if (!ORG_UNIT_TYPES.includes(data.unitType)) {
      throw AppError.validationFailed(`Unknown unit type ${data.unitType}`);
    }
    if (data.parentId) {
      const parent = this.orgUnits.get(data.parentId);
      if (!parent || parent.institutionId !== data.institutionId) {
        throw AppError.validationFailed('Parent unit must belong to the same institution');
      }
    }
    const entity: OrgUnitEntity = {
      id: uuidv7(),
      institutionId: data.institutionId,
      parentId: data.parentId || null,
      name: data.name.trim(),
      unitType: data.unitType,
      createdAt: new Date(),
    };
    this.orgUnits.set(entity.id, entity);
    return entity;
  }

  getOrgUnit(id: string): OrgUnitEntity | null {
    return this.orgUnits.get(id) || null;
  }

  listOrgUnits(institutionId: string, parentId?: string | null): OrgUnitEntity[] {
    return Array.from(this.orgUnits.values())
      .filter((u) => u.institutionId === institutionId)
      .filter((u) => parentId === undefined || u.parentId === (parentId || null))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Nested tree for the onboarding picker. */
  getOrgUnitTree(institutionId: string): Array<OrgUnitEntity & { children: any[] }> {
    const units = this.listOrgUnits(institutionId);
    const build = (parent: OrgUnitEntity): OrgUnitEntity & { children: any[] } => ({
      ...parent,
      children: units.filter((u) => u.parentId === parent.id).map(build),
    });
    return units.filter((u) => !u.parentId).map(build);
  }

  /** True if `descendantId` is `ancestorId` or lies below it. */
  isWithin(descendantId: string, ancestorId: string): boolean {
    let current = this.orgUnits.get(descendantId) || null;
    let guard = 0;
    while (current && guard++ < 50) {
      if (current.id === ancestorId) return true;
      current = current.parentId ? this.orgUnits.get(current.parentId) || null : null;
    }
    return false;
  }

  // ─── Programmes ──────────────────────────────────────────────────

  createProgramme(data: { orgUnitId: string; name: string; degreeType: string }): ProgrammeEntity {
    const unit = this.orgUnits.get(data.orgUnitId);
    if (!unit) throw AppError.validationFailed('Organisational unit not found');
    const entity: ProgrammeEntity = {
      id: uuidv7(),
      institutionId: unit.institutionId,
      orgUnitId: unit.id,
      name: data.name.trim(),
      degreeType: data.degreeType.trim(),
    };
    this.programmes.set(entity.id, entity);
    return entity;
  }

  getProgramme(id: string): ProgrammeEntity | null {
    return this.programmes.get(id) || null;
  }

  listProgrammes(institutionId: string, orgUnitId?: string): ProgrammeEntity[] {
    return Array.from(this.programmes.values()).filter(
      (p) => p.institutionId === institutionId && (!orgUnitId || p.orgUnitId === orgUnitId),
    );
  }

  // ─── Levels, sessions, terms ─────────────────────────────────────

  createLevel(data: { institutionId: string; code: string; name: string; rank: number }): AcademicLevelEntity {
    this.getInstitution(data.institutionId);
    for (const l of this.levels.values()) {
      if (l.institutionId === data.institutionId && l.code === data.code) {
        throw AppError.conflict(`Level ${data.code} already exists`);
      }
    }
    const entity: AcademicLevelEntity = { id: uuidv7(), ...data };
    this.levels.set(entity.id, entity);
    return entity;
  }

  getLevel(id: string): AcademicLevelEntity | null {
    return this.levels.get(id) || null;
  }

  listLevels(institutionId: string): AcademicLevelEntity[] {
    return Array.from(this.levels.values())
      .filter((l) => l.institutionId === institutionId)
      .sort((a, b) => a.rank - b.rank);
  }

  createSession(data: { institutionId: string; name: string; startDate: Date; endDate: Date }): AcademicSessionEntity {
    this.getInstitution(data.institutionId);
    if (data.endDate <= data.startDate) throw AppError.validationFailed('Session must end after it starts');
    const entity: AcademicSessionEntity = { id: uuidv7(), ...data };
    this.sessions.set(entity.id, entity);
    return entity;
  }

  createTerm(data: {
    academicSessionId: string;
    name: string;
    termType?: string;
    startDate: Date;
    endDate: Date;
  }): TermEntity {
    const session = this.sessions.get(data.academicSessionId);
    if (!session) throw AppError.validationFailed('Academic session not found');
    if (data.endDate <= data.startDate) throw AppError.validationFailed('Term must end after it starts');
    const entity: TermEntity = {
      id: uuidv7(),
      institutionId: session.institutionId,
      academicSessionId: session.id,
      name: data.name.trim(),
      termType: data.termType || 'SEMESTER',
      startDate: data.startDate,
      endDate: data.endDate,
    };
    this.terms.set(entity.id, entity);
    return entity;
  }

  getTerm(id: string): TermEntity | null {
    return this.terms.get(id) || null;
  }

  listTerms(institutionId: string): TermEntity[] {
    return Array.from(this.terms.values())
      .filter((t) => t.institutionId === institutionId)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  /** The term containing `at`, or the next upcoming term, or the latest past term. */
  currentTerm(institutionId: string, at: Date = new Date()): TermEntity | null {
    const terms = this.listTerms(institutionId);
    if (terms.length === 0) return null;
    const containing = terms.find((t) => t.startDate <= at && at <= t.endDate);
    if (containing) return containing;
    const upcoming = terms.find((t) => t.startDate > at);
    return upcoming || terms[terms.length - 1]!;
  }

  // ─── Courses and offerings ───────────────────────────────────────

  createCourse(data: {
    id?: string;
    institutionId: string;
    orgUnitId?: string | null;
    code: string;
    title: string;
    credits?: number;
    description?: string | null;
    provenance?: Provenance;
    verifiedBy?: string | null;
  }): CourseEntity {
    this.getInstitution(data.institutionId);
    const code = normaliseCode(data.code);
    if (this.findCourseByCode(data.institutionId, code)) {
      throw AppError.conflict(`Course ${code} already exists at this institution`);
    }
    if (data.orgUnitId) {
      const unit = this.orgUnits.get(data.orgUnitId);
      if (!unit || unit.institutionId !== data.institutionId) {
        throw AppError.validationFailed('Course unit must belong to the same institution');
      }
    }
    const provenance = data.provenance || 'CURATED';
    const entity: CourseEntity = {
      id: data.id || uuidv7(),
      institutionId: data.institutionId,
      orgUnitId: data.orgUnitId || null,
      code,
      title: data.title.trim(),
      credits: data.credits ?? 3,
      description: data.description || null,
      provenance,
      verifiedBy: provenance === 'COMMUNITY' ? null : data.verifiedBy || 'system-seed',
      verifiedAt: provenance === 'COMMUNITY' ? null : new Date(),
      createdAt: new Date(),
    };
    this.courses.set(entity.id, entity);
    return entity;
  }

  getCourse(id: string): CourseEntity | null {
    return this.courses.get(id) || null;
  }

  findCourseByCode(institutionId: string, code: string): CourseEntity | null {
    const normalised = normaliseCode(code);
    for (const c of this.courses.values()) {
      if (c.institutionId === institutionId && c.code === normalised) return c;
    }
    return null;
  }

  searchCourses(institutionId: string, filter: { query?: string; orgUnitId?: string } = {}): CourseEntity[] {
    const q = (filter.query || '').trim().toLowerCase();
    const compactQ = q.replace(/[^a-z0-9]/g, '');
    return Array.from(this.courses.values())
      .filter((c) => c.institutionId === institutionId)
      .filter((c) => !filter.orgUnitId || (c.orgUnitId !== null && this.isWithin(c.orgUnitId, filter.orgUnitId)))
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.code.toLowerCase().replace(/[^a-z0-9]/g, '').includes(compactQ),
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  createOffering(data: { courseId: string; termId: string; academicLevelId?: string | null }): CourseOfferingEntity {
    const course = this.courses.get(data.courseId);
    if (!course) throw AppError.validationFailed('Course not found');
    const term = this.terms.get(data.termId);
    if (!term || term.institutionId !== course.institutionId) {
      throw AppError.validationFailed('Term must belong to the course institution');
    }
    if (data.academicLevelId) {
      const level = this.levels.get(data.academicLevelId);
      if (!level || level.institutionId !== course.institutionId) {
        throw AppError.validationFailed('Level must belong to the course institution');
      }
    }
    const existing = this.findOffering(data.courseId, data.termId);
    if (existing) return existing; // idempotent
    const entity: CourseOfferingEntity = {
      id: uuidv7(),
      institutionId: course.institutionId,
      courseId: course.id,
      termId: term.id,
      academicLevelId: data.academicLevelId || null,
    };
    this.offerings.set(entity.id, entity);
    return entity;
  }

  findOffering(courseId: string, termId: string): CourseOfferingEntity | null {
    for (const o of this.offerings.values()) {
      if (o.courseId === courseId && o.termId === termId) return o;
    }
    return null;
  }

  getOffering(id: string): CourseOfferingEntity | null {
    return this.offerings.get(id) || null;
  }

  listOfferings(termId: string, academicLevelId?: string): Array<CourseOfferingEntity & { course: CourseEntity }> {
    return Array.from(this.offerings.values())
      .filter((o) => o.termId === termId && (!academicLevelId || o.academicLevelId === academicLevelId))
      .map((o) => ({ ...o, course: this.courses.get(o.courseId)! }))
      .sort((a, b) => a.course.code.localeCompare(b.course.code));
  }

  // ─── "Institution not listed" path ───────────────────────────────

  requestInstitution(data: {
    userId: string;
    name: string;
    countryCode?: string;
    website?: string | null;
    note?: string | null;
  }): InstitutionRequestEntity {
    const name = data.name.trim();
    if (name.length < 2 || name.length > 255) {
      throw AppError.validationFailed('Institution name must be between 2 and 255 characters');
    }
    // One open request per user: resubmitting updates nothing and returns the existing one.
    for (const r of this.institutionRequests.values()) {
      if (r.userId === data.userId && r.status === 'PENDING') return r;
    }
    const entity: InstitutionRequestEntity = {
      id: uuidv7(),
      userId: data.userId,
      name,
      countryCode: (data.countryCode || 'NG').toUpperCase(),
      website: data.website || null,
      note: data.note || null,
      status: 'PENDING',
      reviewedBy: null,
      createdAt: new Date(),
    };
    this.institutionRequests.set(entity.id, entity);
    this.events?.publish('institution.requested', { requestId: entity.id, userId: data.userId, name });
    return entity;
  }

  listInstitutionRequests(actor: Actor, status: RequestStatus = 'PENDING'): InstitutionRequestEntity[] {
    if (!canReviewAcademicData(actor)) throw AppError.forbidden('Staff access required');
    return Array.from(this.institutionRequests.values()).filter((r) => r.status === status);
  }

  /** Requester sees only their own requests. */
  myInstitutionRequests(userId: string): InstitutionRequestEntity[] {
    return Array.from(this.institutionRequests.values()).filter((r) => r.userId === userId);
  }

  reviewInstitutionRequest(actor: Actor, requestId: string, decision: 'APPROVED' | 'REJECTED'): InstitutionRequestEntity {
    if (!canReviewAcademicData(actor)) throw AppError.forbidden('Staff access required');
    const req = this.institutionRequests.get(requestId);
    if (!req) throw AppError.notFound('Request not found');
    if (req.status !== 'PENDING') throw AppError.invalidState('Request has already been reviewed');
    req.status = decision;
    req.reviewedBy = actor.userId;
    return req;
  }

  // ─── "Propose missing course" path ───────────────────────────────

  /**
   * A student proposes a course that is not in the catalogue.
   *
   * Rule (DATABASE_DESIGN.md ch.08): student-contributed data is low quality
   * until reviewed; "two independent confirmations or admin approval".
   * - Proposals for the same (institution, code) are merged.
   * - When COURSE_PROPOSAL_CONFIRMATIONS distinct students have proposed it, the
   *   course is created with provenance COMMUNITY (unverified, clearly labelled).
   * - An admin can approve earlier, which creates the course as CURATED.
   */
  proposeCourse(data: {
    userId: string;
    institutionId: string;
    code: string;
    title: string;
    orgUnitId?: string | null;
  }): { proposal: CourseProposalEntity; course: CourseEntity | null } {
    this.getInstitution(data.institutionId);
    const code = normaliseCode(data.code);
    if (!/^[A-Z]{2,6} ?\d{2,4}[A-Z]?$/.test(code)) {
      throw AppError.validationFailed('Course code should look like "CSC 301"');
    }
    const title = data.title.trim();
    if (title.length < 3 || title.length > 200) {
      throw AppError.validationFailed('Course title must be between 3 and 200 characters');
    }

    const existingCourse = this.findCourseByCode(data.institutionId, code);
    if (existingCourse) {
      throw AppError.conflict('This course is already in the catalogue — select it instead', {
        courseId: existingCourse.id,
      });
    }

    let proposal = Array.from(this.courseProposals.values()).find(
      (p) => p.institutionId === data.institutionId && p.code === code && p.status === 'PENDING',
    );
    if (!proposal) {
      proposal = {
        id: uuidv7(),
        institutionId: data.institutionId,
        code,
        title,
        orgUnitId: data.orgUnitId || null,
        proposerIds: [],
        status: 'PENDING',
        courseId: null,
        reviewedBy: null,
        createdAt: new Date(),
      };
      this.courseProposals.set(proposal.id, proposal);
    }
    if (!proposal.proposerIds.includes(data.userId)) {
      proposal.proposerIds.push(data.userId);
    }

    let course: CourseEntity | null = null;
    if (proposal.proposerIds.length >= COURSE_PROPOSAL_CONFIRMATIONS) {
      course = this.materialiseProposal(proposal, 'COMMUNITY', null);
    }
    return { proposal, course };
  }

  getCourseProposal(id: string): CourseProposalEntity | null {
    return this.courseProposals.get(id) || null;
  }

  pendingProposalsFor(userId: string): CourseProposalEntity[] {
    return Array.from(this.courseProposals.values()).filter(
      (p) => p.status === 'PENDING' && p.proposerIds.includes(userId),
    );
  }

  listCourseProposals(actor: Actor, status: RequestStatus = 'PENDING'): CourseProposalEntity[] {
    if (!canReviewAcademicData(actor)) throw AppError.forbidden('Staff access required');
    return Array.from(this.courseProposals.values()).filter((p) => p.status === status);
  }

  reviewCourseProposal(
    actor: Actor,
    proposalId: string,
    decision: 'APPROVED' | 'REJECTED',
  ): { proposal: CourseProposalEntity; course: CourseEntity | null } {
    if (!canReviewAcademicData(actor)) throw AppError.forbidden('Staff access required');
    const proposal = this.courseProposals.get(proposalId);
    if (!proposal) throw AppError.notFound('Proposal not found');
    if (proposal.status !== 'PENDING') throw AppError.invalidState('Proposal has already been reviewed');
    if (decision === 'REJECTED') {
      proposal.status = 'REJECTED';
      proposal.reviewedBy = actor.userId;
      return { proposal, course: null };
    }
    const course = this.materialiseProposal(proposal, 'CURATED', actor.userId);
    return { proposal, course };
  }

  private materialiseProposal(
    proposal: CourseProposalEntity,
    provenance: Provenance,
    reviewerId: string | null,
  ): CourseEntity {
    const course = this.createCourse({
      institutionId: proposal.institutionId,
      orgUnitId: proposal.orgUnitId,
      code: proposal.code,
      title: proposal.title,
      provenance,
      verifiedBy: reviewerId,
    });
    proposal.status = 'APPROVED';
    proposal.courseId = course.id;
    proposal.reviewedBy = reviewerId;
    this.events?.publish('course.created_from_proposal', {
      courseId: course.id,
      institutionId: course.institutionId,
      proposerIds: [...proposal.proposerIds],
    });
    return course;
  }
}
