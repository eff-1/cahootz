import { z } from 'zod';
import {
  SESSION_DEFAULTS,
  SESSION_STATES,
  PING_OUTCOMES,
  ROLES,
  VERIFICATION_METHODS,
  VISIBILITY,
  AGE,
} from '../constants/index.ts';

// ─── Common / Primitives ────────────────────────────────────────────

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});

// ─── Identity / Auth Schemas ────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  dateOfBirth: z.string().refine((val) => {
    const dob = new Date(val);
    if (isNaN(dob.getTime())) return false;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age >= AGE.MINIMUM_AGE;
  }, `You must be at least ${AGE.MINIMUM_AGE} years old to register`),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().length(6).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const enableTotpSchema = z.object({
  secret: z.string().min(16),
  code: z.string().length(6),
});

export const verifyTotpSchema = z.object({
  code: z.string().length(6),
});

// ─── Academic & Onboarding Schemas ──────────────────────────────────

export const academicProfileUpdateSchema = z.object({
  institutionId: uuidSchema,
  orgUnitId: uuidSchema.optional(),
  programmeId: uuidSchema.optional(),
  levelId: uuidSchema.optional(),
  termId: uuidSchema.optional(),
  courseIds: z.array(uuidSchema).min(1, 'Select at least one course'),
});

export const institutionRequestSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  countryCode: z.string().length(2).toUpperCase(),
  website: z.string().url().optional(),
  evidenceNote: z.string().max(1000).optional(),
});

// ─── Profile Schemas ────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).trim(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
  visibility: z.nativeEnum(VISIBILITY).default(VISIBILITY.INSTITUTION),
  isDiscoverable: z.boolean().default(true),
  timezone: z.string().default('Africa/Lagos'),
});

// ─── Study Invitation Schemas ───────────────────────────────────────

export const createStudyInvitationSchema = z.object({
  recipientId: uuidSchema,
  courseId: uuidSchema,
  proposedStart: z.string().datetime(),
  durationMinutes: z
    .number()
    .int()
    .min(SESSION_DEFAULTS.MIN_DURATION_MINUTES)
    .max(SESSION_DEFAULTS.MAX_DURATION_MINUTES)
    .default(SESSION_DEFAULTS.DEFAULT_DURATION_MINUTES),
  message: z.string().max(500).optional(),
});

// ─── Study Together Schemas ─────────────────────────────────────────

export const createStudySessionSchema = z.object({
  participantIds: z.array(uuidSchema).min(2).max(SESSION_DEFAULTS.MAX_PARTICIPANTS_MVP),
  courseId: uuidSchema,
  durationMinutes: z
    .number()
    .int()
    .min(SESSION_DEFAULTS.MIN_DURATION_MINUTES)
    .max(SESSION_DEFAULTS.MAX_DURATION_MINUTES)
    .default(SESSION_DEFAULTS.DEFAULT_DURATION_MINUTES),
  cycle: z.enum(['CONTINUOUS', 'POMODORO_50_10', 'POMODORO_25_5']).default('POMODORO_50_10'),
  pingPolicy: z.enum(['OFF', 'LIGHT', 'CUSTOM']).default('LIGHT'),
  responseWindowSeconds: z
    .number()
    .int()
    .min(SESSION_DEFAULTS.MIN_RESPONSE_WINDOW_SECONDS)
    .max(SESSION_DEFAULTS.MAX_RESPONSE_WINDOW_SECONDS)
    .default(SESSION_DEFAULTS.DEFAULT_RESPONSE_WINDOW_SECONDS),
  goal: z.string().min(3).max(255).trim(),
});

export const updateSessionGoalSchema = z.object({
  goal: z.string().min(3).max(255).trim(),
});

export const sendSignalSchema = z.object({
  targetUserId: uuidSchema.optional(),
});

export const ackSignalSchema = z.object({
  signalId: uuidSchema,
});

export const disputeSessionSchema = z.object({
  reason: z.string().min(10).max(1000).trim(),
  evidenceDetails: z.record(z.unknown()).optional(),
});

// ─── Reporting & Safety Schemas ─────────────────────────────────────

export const createReportSchema = z.object({
  targetType: z.enum(['USER', 'MESSAGE', 'SESSION', 'POST', 'COMMENT']),
  targetId: uuidSchema,
  reason: z.enum([
    'HARASSMENT',
    'SEXUAL_CONTENT',
    'HATE_SPEECH',
    'SCAM_SPAM',
    'IMPERSONATION',
    'ACADEMIC_MISCONDUCT',
    'INAPPROPRIATE_SOLICITATION',
    'OTHER',
  ]),
  notes: z.string().max(1000).optional(),
});

export const createBlockSchema = z.object({
  blockedUserId: uuidSchema,
});

// ─── Types Inferred from Schemas ────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AcademicProfileUpdateInput = z.infer<typeof academicProfileUpdateSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateStudyInvitationInput = z.infer<typeof createStudyInvitationSchema>;
export type CreateStudySessionInput = z.infer<typeof createStudySessionSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
