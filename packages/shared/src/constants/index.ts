/**
 * Cahootz Shared Constants
 *
 * Brand name is kept in a single constant so renaming is one change.
 * Never hard-code the name elsewhere — always import from here.
 */

// ─── Brand ──────────────────────────────────────────────────────────
/** Working name. Change here to rename everywhere. */
export const BRAND_NAME = 'Cahootz' as const;
export const BRAND_TAGLINE = 'Learn together. Go further.' as const;
export const BRAND_PROPOSITION = 'Find your people. Stay accountable. Learn better.' as const;

// ─── API ────────────────────────────────────────────────────────────
export const API_VERSION = 'v1' as const;
export const API_BASE_PATH = `/api/${API_VERSION}` as const;

// ─── Session Defaults (PROPOSED — OPEN-11) ──────────────────────────
export const SESSION_DEFAULTS = {
  /** Minimum session duration in minutes */
  MIN_DURATION_MINUTES: 15,
  /** Maximum session duration in minutes */
  MAX_DURATION_MINUTES: 240,
  /** Default session duration in minutes */
  DEFAULT_DURATION_MINUTES: 60,
  /** Default focus block in minutes */
  DEFAULT_FOCUS_MINUTES: 50,
  /** Default break block in minutes */
  DEFAULT_BREAK_MINUTES: 10,
  /** Default accountability ping frequency in minutes */
  DEFAULT_PING_INTERVAL_MINUTES: 25,
  /** Default response window for pings in seconds */
  DEFAULT_RESPONSE_WINDOW_SECONDS: 90,
  /** Minimum response window in seconds */
  MIN_RESPONSE_WINDOW_SECONDS: 30,
  /** Maximum response window in seconds */
  MAX_RESPONSE_WINDOW_SECONDS: 180,
  /** Max participants in MVP (one-on-one only) */
  MAX_PARTICIPANTS_MVP: 2,
} as const;

// ─── Presence & Heartbeat (PROPOSED) ────────────────────────────────
export const PRESENCE = {
  /** Heartbeat interval when tab is visible (seconds) */
  HEARTBEAT_INTERVAL_VISIBLE_SECONDS: 15,
  /** Heartbeat interval when tab is in background (seconds) */
  HEARTBEAT_INTERVAL_BACKGROUND_SECONDS: 30,
  /** Redis TTL for presence key (seconds) */
  PRESENCE_TTL_SECONDS: 45,
  /** Grace period before marking as AWAY_UNREACHABLE (seconds) */
  GRACE_PERIOD_SECONDS: 300, // 5 minutes
  /** Grace period before session can be ABANDONED (seconds) */
  ABANDON_GRACE_SECONDS: 600, // 10 minutes
} as const;

// ─── Completion Criteria (D-012: 70% per execution prompt) ──────────
export const COMPLETION = {
  /** Minimum connected time percentage for full completion */
  FULL_COMPLETION_THRESHOLD: 0.7,
  /** Minimum connected time percentage for partial completion */
  PARTIAL_COMPLETION_THRESHOLD: 0.5,
  /** Max missed pings with healthy connection for completion */
  MAX_CONNECTED_MISSED_PINGS: 1,
  /** Minimum session duration for streak credit (minutes) */
  MIN_STREAK_DURATION_MINUTES: 25,
} as const;

// ─── Streaks (PROPOSED) ─────────────────────────────────────────────
export const STREAKS = {
  /** Freeze allowance per 14-day period */
  FREEZES_PER_PERIOD: 1,
  /** Period for freeze reset (days) */
  FREEZE_PERIOD_DAYS: 14,
} as const;

// ─── Reliability Bands (D-014: 4 bands per execution prompt) ────────
export const RELIABILITY_BANDS = {
  NEW: 'New',
  BUILDING: 'Building',
  RELIABLE: 'Reliable',
  VERY_RELIABLE: 'Very Reliable',
} as const;

export type ReliabilityBand = (typeof RELIABILITY_BANDS)[keyof typeof RELIABILITY_BANDS];

// ─── Disputes (D-013: 24h per execution prompt) ────────────────────
export const DISPUTES = {
  /** Window to file a dispute after session ends (hours) */
  DISPUTE_WINDOW_HOURS: 24,
} as const;

// ─── Rate Limits (PROPOSED) ─────────────────────────────────────────
export const RATE_LIMITS = {
  /** Max login attempts per account per 15 minutes */
  LOGIN_ATTEMPTS_PER_15MIN: 5,
  /** Max registration attempts per IP per hour */
  REGISTER_ATTEMPTS_PER_HOUR: 3,
  /** Max study invitations sent per day */
  INVITATIONS_PER_DAY: 10,
  /** Max pings per session per user */
  PINGS_PER_SESSION: 10,
  /** Max reports per user per day */
  REPORTS_PER_DAY: 5,
  /** Max messages per conversation per minute */
  MESSAGES_PER_MINUTE: 30,
  /** Cooldown after repeated declines from same user (hours) */
  DECLINE_COOLDOWN_HOURS: 24,
} as const;

// ─── XP Awards (PROPOSED) ───────────────────────────────────────────
export const XP = {
  /** XP per completed session (base, scaled by duration) */
  BASE_SESSION_XP: 50,
  /** XP per streak day bonus */
  STREAK_DAY_BONUS: 10,
  /** Max XP earnable per day */
  DAILY_CAP: 500,
  /** Diminishing factor for same-pair sessions in a day */
  SAME_PAIR_DIMINISH_FACTOR: 0.5,
} as const;

// ─── Session States ─────────────────────────────────────────────────
export const SESSION_STATES = {
  CREATED: 'CREATED',
  INVITED: 'INVITED',
  SCHEDULED: 'SCHEDULED',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  ABANDONED: 'ABANDONED',
  DISPUTED: 'DISPUTED',
} as const;

export type SessionState = (typeof SESSION_STATES)[keyof typeof SESSION_STATES];

// ─── Presence States ────────────────────────────────────────────────
export const PRESENCE_STATES = {
  PRESENT: 'PRESENT',
  AWAY_UNREACHABLE: 'AWAY_UNREACHABLE',
  OFFLINE_EXCUSED: 'OFFLINE_EXCUSED',
} as const;

export type PresenceState = (typeof PRESENCE_STATES)[keyof typeof PRESENCE_STATES];

// ─── Ping Outcomes ──────────────────────────────────────────────────
export const PING_OUTCOMES = {
  ANSWERED: 'ANSWERED',
  MISSED_CONNECTED: 'MISSED_CONNECTED',
  MISSED_DISCONNECTED: 'MISSED_DISCONNECTED',
  EXCUSED: 'EXCUSED',
} as const;

export type PingOutcome = (typeof PING_OUTCOMES)[keyof typeof PING_OUTCOMES];

// ─── Error Codes (from API_SPECIFICATION.md) ────────────────────────
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_STATE: 'INVALID_STATE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── User Roles ─────────────────────────────────────────────────────
export const ROLES = {
  STUDENT: 'STUDENT',
  COMMUNITY_MODERATOR: 'COMMUNITY_MODERATOR',
  PLATFORM_MODERATOR: 'PLATFORM_MODERATOR',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ─── Verification ───────────────────────────────────────────────────
export const VERIFICATION_METHODS = {
  EMAIL_DOMAIN: 'EMAIL_DOMAIN',
  DOCUMENT_REVIEW: 'DOCUMENT_REVIEW',
  PEER_VOUCH: 'PEER_VOUCH',
  PARTNER_ROSTER: 'PARTNER_ROSTER',
} as const;

export type VerificationMethod =
  (typeof VERIFICATION_METHODS)[keyof typeof VERIFICATION_METHODS];

export const VERIFICATION_STATUS = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

// ─── Profile Visibility (default: institution-only) ─────────────────
export const VISIBILITY = {
  PUBLIC: 'PUBLIC',
  INSTITUTION: 'INSTITUTION',
  CONNECTIONS: 'CONNECTIONS',
  PRIVATE: 'PRIVATE',
} as const;

export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

// ─── Pagination ─────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
} as const;

// ─── Minimum Age ────────────────────────────────────────────────────
// OPEN-06: Under-16 disallowed; 16-17 restricted mode; needs counsel
export const AGE = {
  MINIMUM_AGE: 16,
  RESTRICTED_AGE_THRESHOLD: 18,
} as const;

// ─── Emergency Exit ─────────────────────────────────────────────────
export const EMERGENCY_EXIT = {
  /** Max emergency exits per week */
  MAX_PER_WEEK: 3,
} as const;

