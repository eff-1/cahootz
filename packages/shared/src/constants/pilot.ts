/**
 * Pilot configuration.
 *
 * OPEN-01: the pilot institution has not been chosen by the founder.
 * Until real data is supplied, a clearly labelled SAMPLE institution is used.
 * Replacing it means editing this object and re-running the seed script —
 * nothing else in the codebase hard-codes institution names.
 */
export const PILOT_INSTITUTION = {
  // OPEN: Q-01 — placeholder until founder supplies the pilot institution
  name: 'Sample University (SAMPLE DATA)',
  code: 'SAMPLE',
  countryCode: 'NG',
  // Reserved `.example` TLD (RFC 2606) so no real domain is impersonated.
  emailDomains: ['student.sample-university.example'],
  isSample: true,
} as const;

/** Default timezone for Nigerian pilot users. Users can change it in their profile. */
export const DEFAULT_TIMEZONE = 'Africa/Lagos' as const;

/** Institutional email OTP settings (OPEN-02 safe default). */
export const INSTITUTION_EMAIL_OTP = {
  CODE_LENGTH: 6,
  TTL_MINUTES: 15,
  MAX_ATTEMPTS: 5,
  MAX_REQUESTS_PER_HOUR: 3,
} as const;

/** Student-proposed courses become COMMUNITY courses after this many independent confirmations. */
export const COURSE_PROPOSAL_CONFIRMATIONS = 2 as const;

/** Maximum interests a student can list on their profile. */
export const MAX_INTERESTS = 10 as const;

/** Maximum courses a student may enrol in per term (abuse limit, not an academic rule). */
export const MAX_COURSES_PER_TERM = 15 as const;

