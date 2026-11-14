import {
  RegisterInput,
  LoginInput,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  enableTotpSchema,
  verifyTotpSchema,
} from '@cahootz/shared';

export {
  RegisterInput,
  LoginInput,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  enableTotpSchema,
  verifyTotpSchema,
};

export interface SessionDto {
  id: string;
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  isCurrent: boolean;
}

export interface AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    isVerified: boolean;
    isRestricted: boolean;
    roles: string[];
    institutionId?: string | null;
  };
}

