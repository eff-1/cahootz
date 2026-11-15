import { InstitutionsService } from '../modules/institutions/institutions.service.ts';
import { PILOT_INSTITUTION } from '../../../../packages/shared/src/index.ts';

/**
 * Seeds the pilot institution with SAMPLE data.
 *
 * OPEN-01 / OPEN-04: the founder has not supplied the pilot institution or its
 * catalogue. Everything below is invented placeholder data, labelled SAMPLE in
 * the institution name and every course description. It must be replaced
 * before any student sees it.
 *
 * The structure intentionally mixes FACULTY→DEPARTMENT and COLLEGE→SCHOOL
 * shapes to prove the generic org-unit tree (D-009) handles both.
 *
 * Idempotent: running it twice against the same service returns the existing data.
 */
export interface PilotSeedResult {
  institutionId: string;
  orgUnits: Record<string, string>;
  programmes: Record<string, string>;
  levels: Record<string, string>;
  termIds: { first: string; second: string };
  courses: Record<string, string>;
}

const SAMPLE_NOTE = 'SAMPLE DATA — placeholder, not an official course record.';

export function seedPilotInstitution(svc: InstitutionsService, now: Date = new Date()): PilotSeedResult {
  const existing = svc
    .searchInstitutions(PILOT_INSTITUTION.code, PILOT_INSTITUTION.countryCode)
    .find((i) => i.code === PILOT_INSTITUTION.code);
  if (existing) {
    return describe(svc, existing.id);
  }

  const inst = svc.createInstitution({
    id: 'inst-pilot-sample-uni',
    name: PILOT_INSTITUTION.name,
    code: PILOT_INSTITUTION.code,
    countryCode: PILOT_INSTITUTION.countryCode,
    emailDomains: PILOT_INSTITUTION.emailDomains,
    isSample: true,
    aliases: ['SU', 'Sample Uni'],
  });

  // Faculty → Department shape
  const science = svc.createOrgUnit({ institutionId: inst.id, name: 'Faculty of Science', unitType: 'FACULTY' });
  const csc = svc.createOrgUnit({ institutionId: inst.id, parentId: science.id, name: 'Department of Computer Science', unitType: 'DEPARTMENT' });
  const mth = svc.createOrgUnit({ institutionId: inst.id, parentId: science.id, name: 'Department of Mathematics', unitType: 'DEPARTMENT' });
  const engineering = svc.createOrgUnit({ institutionId: inst.id, name: 'Faculty of Engineering', unitType: 'FACULTY' });
  const eee = svc.createOrgUnit({ institutionId: inst.id, parentId: engineering.id, name: 'Department of Electrical and Electronic Engineering', unitType: 'DEPARTMENT' });
  // College → School shape
  const health = svc.createOrgUnit({ institutionId: inst.id, name: 'College of Health Sciences', unitType: 'COLLEGE' });
  const nursing = svc.createOrgUnit({ institutionId: inst.id, parentId: health.id, name: 'School of Nursing', unitType: 'SCHOOL' });

  svc.createProgramme({ orgUnitId: csc.id, name: 'Computer Science', degreeType: 'B.Sc.' });
  svc.createProgramme({ orgUnitId: mth.id, name: 'Mathematics', degreeType: 'B.Sc.' });
  svc.createProgramme({ orgUnitId: eee.id, name: 'Electrical and Electronic Engineering', degreeType: 'B.Eng.' });
  svc.createProgramme({ orgUnitId: nursing.id, name: 'Nursing Science', degreeType: 'B.N.Sc.' });

  const levels = ['100', '200', '300', '400', '500'].map((code, i) =>
    svc.createLevel({ institutionId: inst.id, code, name: `${code} Level`, rank: i + 1 }),
  );

  // Session spanning `now`, so the current term resolves during the pilot.
  const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const session = svc.createSession({
    institutionId: inst.id,
    name: `${year}/${year + 1}`,
    startDate: new Date(Date.UTC(year, 8, 1)),
    endDate: new Date(Date.UTC(year + 1, 7, 31)),
  });
  const first = svc.createTerm({
    academicSessionId: session.id,
    name: 'First Semester',
    startDate: new Date(Date.UTC(year, 8, 1)),
    endDate: new Date(Date.UTC(year + 1, 0, 31)),
  });
  const second = svc.createTerm({
    academicSessionId: session.id,
    name: 'Second Semester',
    startDate: new Date(Date.UTC(year + 1, 1, 1)),
    endDate: new Date(Date.UTC(year + 1, 7, 31)),
  });

  const catalogue: Array<{ code: string; title: string; unit: string; level: number }> = [
    { code: 'CSC 101', title: 'Introduction to Computing', unit: csc.id, level: 0 },
    { code: 'CSC 201', title: 'Data Structures', unit: csc.id, level: 1 },
    { code: 'CSC 205', title: 'Discrete Structures', unit: csc.id, level: 1 },
    { code: 'CSC 301', title: 'Operating Systems', unit: csc.id, level: 2 },
    { code: 'CSC 305', title: 'Database Systems', unit: csc.id, level: 2 },
    { code: 'CSC 401', title: 'Compiler Construction', unit: csc.id, level: 3 },
    { code: 'MTH 101', title: 'Elementary Mathematics I', unit: mth.id, level: 0 },
    { code: 'MTH 201', title: 'Linear Algebra', unit: mth.id, level: 1 },
    { code: 'EEE 201', title: 'Circuit Theory', unit: eee.id, level: 1 },
    { code: 'NSC 201', title: 'Anatomy and Physiology', unit: nursing.id, level: 1 },
  ];
  for (const item of catalogue) {
    const slug = item.code.toLowerCase().replace(/\s+/g, '-');
    const course = svc.createCourse({
      id: `course-pilot-${slug}`,
      institutionId: inst.id,
      orgUnitId: item.unit,
      code: item.code,
      title: item.title,
      description: SAMPLE_NOTE,
      provenance: 'CURATED',
      verifiedBy: 'seed:SAMPLE',
    });
    svc.createOffering({ courseId: course.id, termId: first.id, academicLevelId: levels[item.level]!.id });
  }

  return describe(svc, inst.id);
}

function describe(svc: InstitutionsService, institutionId: string): PilotSeedResult {
  const orgUnits: Record<string, string> = {};
  for (const u of svc.listOrgUnits(institutionId)) orgUnits[u.name] = u.id;
  const programmes: Record<string, string> = {};
  for (const p of svc.listProgrammes(institutionId)) programmes[p.name] = p.id;
  const levels: Record<string, string> = {};
  for (const l of svc.listLevels(institutionId)) levels[l.code] = l.id;
  const terms = svc.listTerms(institutionId);
  const courses: Record<string, string> = {};
  for (const c of svc.searchCourses(institutionId)) courses[c.code] = c.id;
  return {
    institutionId,
    orgUnits,
    programmes,
    levels,
    termIds: { first: terms[0]!.id, second: terms[1]!.id },
    courses,
  };
}

// Allow `node --experimental-strip-types src/seed/pilot-seed.ts` to print a summary.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('pilot-seed.ts')) {
  const result = seedPilotInstitution(new InstitutionsService());
  console.log(
    JSON.stringify(
      {
        institution: PILOT_INSTITUTION.name,
        orgUnits: Object.keys(result.orgUnits).length,
        programmes: Object.keys(result.programmes).length,
        levels: Object.keys(result.levels),
        courses: Object.keys(result.courses),
      },
      null,
      2,
    ),
  );
}

