import * as crypto from 'crypto';
import {
  type RegisterInput,
  type LoginInput,
  AGE,
  ROLES,
} from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { PasswordService } from './password.service.ts';
import { TokenService, type JwtPayload } from './token.service.ts';
import { TotpService } from './totp.service.ts';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  dateOfBirth: Date;
  isVerified: boolean;
  isStaff: boolean;
  totpSecret: string | null;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  profile: {
    displayName: string;
    visibility: string;
    isDiscoverable: boolean;
    timezone: string;
    institutionId: string | null;
  };
  roles: string[];
}

export interface SessionEntity {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class IdentityService {
  private readonly passwordService: PasswordService;
  private readonly tokenService: TokenService;
  private readonly totpService: TotpService;

  // In-memory repositories supporting both standalone tests and DB synchronization
  private readonly users = new Map<string, UserEntity>();
  private readonly usersByEmail = new Map<string, string>(); // email -> userId
  private readonly sessions = new Map<string, SessionEntity>();
  private readonly sessionsByTokenHash = new Map<string, string>(); // tokenHash -> sessionId
  private readonly consumedTokenHashes = new Map<string, string>(); // tokenHash -> userId (for replay detection)
  private readonly verificationTokens = new Map<string, { userId: string; expiresAt: Date }>();
  private readonly resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(
    passwordService?: PasswordService,
    tokenService?: TokenService,
    totpService?: TotpService,
  ) {
    this.passwordService = passwordService || new PasswordService();
    this.tokenService = tokenService || new TokenService();
    this.totpService = totpService || new TotpService();
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private computeAge(dob: Date): number {
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  async register(input: RegisterInput, clientMeta?: { ip?: string; userAgent?: string }) {
    const email = input.email.toLowerCase().trim();
    const dob = new Date(input.dateOfBirth);
    const age = this.computeAge(dob);

    if (age < AGE.MINIMUM_AGE) {
      throw AppError.validationFailed(`You must be at least ${AGE.MINIMUM_AGE} years old to register`);
    }

    if (this.usersByEmail.has(email)) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const isRestricted = age < AGE.RESTRICTED_AGE_THRESHOLD;
    const userId = crypto.randomUUID();
    const displayName = email.split('@')[0] || 'Student';

    const newUser: UserEntity = {
      id: userId,
      email,
      passwordHash,
      dateOfBirth: dob,
      isVerified: false,
      isStaff: false,
      totpSecret: null,
      totpEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      profile: {
        displayName,
        visibility: 'INSTITUTION',
        isDiscoverable: !isRestricted,
        timezone: 'Africa/Lagos',
        institutionId: null,
      },
      roles: [ROLES.STUDENT],
    };

    this.users.set(userId, newUser);
    this.usersByEmail.set(email, userId);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    this.verificationTokens.set(verificationToken, {
      userId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return {
      userId,
      email,
      isRestricted,
      verificationToken,
    };
  }

  async verifyEmail(token: string) {
    const record = this.verificationTokens.get(token);
    if (!record || record.expiresAt < new Date()) {
      this.verificationTokens.delete(token);
      throw AppError.validationFailed('Invalid or expired verification token');
    }

    const user = this.users.get(record.userId);
    if (user) {
      user.isVerified = true;
      user.updatedAt = new Date();
    }

    this.verificationTokens.delete(token);
    return { success: true, message: 'Email successfully verified' };
  }

  async login(
    input: LoginInput,
    clientMeta: { ip?: string; userAgent?: string; deviceName?: string } = {},
  ) {
    const genericAuthError = AppError.unauthenticated('Invalid email or password');
    const email = input.email.toLowerCase().trim();
    const userId = this.usersByEmail.get(email);
    const user = userId ? this.users.get(userId) : null;

    if (!user || user.deletedAt) {
      await this.passwordService.hash('timing-dummy');
      throw genericAuthError;
    }

    const passwordValid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!passwordValid) {
      throw genericAuthError;
    }

    // TOTP MFA verification for staff or opted-in accounts
    if (user.totpEnabled && user.totpSecret) {
      if (!input.totpCode) {
        return {
          mfaRequired: true,
          message: 'Two-factor authentication code required',
        };
      }
      const isTotpValid = this.totpService.verify(input.totpCode, user.totpSecret);
      if (!isTotpValid) {
        throw AppError.unauthenticated('Invalid two-factor authentication code');
      }
    }

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const sessionId = crypto.randomUUID();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session: SessionEntity = {
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      deviceName: clientMeta.deviceName || 'Web Browser',
      ipAddress: clientMeta.ip || null,
      userAgent: clientMeta.userAgent || null,
      isRevoked: false,
      expiresAt: refreshExpiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.sessionsByTokenHash.set(refreshTokenHash, sessionId);

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      institutionId: user.profile.institutionId,
      sessionId,
    };

    const accessToken = this.tokenService.sign(payload, 900);
    const isRestricted = this.computeAge(user.dateOfBirth) < AGE.RESTRICTED_AGE_THRESHOLD;

    return {
      mfaRequired: false,
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.profile.displayName,
        isVerified: user.isVerified,
        isRestricted,
        roles: user.roles,
        institutionId: user.profile.institutionId,
      },
    };
  }

  async refresh(
    rawRefreshToken: string,
    clientMeta: { ip?: string; userAgent?: string; deviceName?: string } = {},
  ) {
    if (!rawRefreshToken) {
      throw AppError.unauthenticated('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    // 1. REPLAY ATTACK DETECTION: Was this token previously rotated?
    if (this.consumedTokenHashes.has(tokenHash)) {
      const compromisedUserId = this.consumedTokenHashes.get(tokenHash)!;
      // Revoke all sessions for the compromised user
      for (const s of this.sessions.values()) {
        if (s.userId === compromisedUserId) {
          s.isRevoked = true;
        }
      }
      throw AppError.unauthenticated('Security Alert: Replay attack detected. All sessions revoked.');
    }

    const sessionId = this.sessionsByTokenHash.get(tokenHash);
    const session = sessionId ? this.sessions.get(sessionId) : null;

    if (!session) {
      throw AppError.unauthenticated('Invalid or expired refresh token');
    }

    if (session.isRevoked || session.expiresAt < new Date()) {
      for (const s of this.sessions.values()) {
        if (s.userId === session.userId) {
          s.isRevoked = true;
        }
      }
      throw AppError.unauthenticated('Session revoked due to security alert');
    }

    // 2. Token Rotation: Mark old token as consumed
    this.sessionsByTokenHash.delete(tokenHash);
    this.consumedTokenHashes.set(tokenHash, session.userId);

    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = this.hashToken(newRawRefreshToken);

    session.refreshTokenHash = newRefreshTokenHash;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    session.updatedAt = new Date();
    this.sessionsByTokenHash.set(newRefreshTokenHash, session.id);

    const user = this.users.get(session.userId);
    if (!user) {
      throw AppError.unauthenticated('User not found');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      institutionId: user.profile.institutionId,
      sessionId: session.id,
    };

    const accessToken = this.tokenService.sign(payload, 900);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
    }
    return { success: true };
  }

  async signOutEverywhere(userId: string) {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.isRevoked = true;
      }
    }
    return { success: true, message: 'All sessions have been revoked' };
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const activeSessions: Array<{
      id: string;
      deviceName: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      isCurrent: boolean;
    }> = [];

    const now = new Date();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.isRevoked && session.expiresAt > now) {
        activeSessions.push({
          id: session.id,
          deviceName: session.deviceName,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          isCurrent: session.id === currentSessionId,
        });
      }
    }

    activeSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activeSessions;
  }

  async revokeSession(userId: string, targetSessionId: string) {
    const session = this.sessions.get(targetSessionId);
    if (!session || session.userId !== userId) {
      throw AppError.notFound('Session not found');
    }

    session.isRevoked = true;
    return { success: true };
  }

  async requestPasswordReset(emailInput: string) {
    const email = emailInput.toLowerCase().trim();
    const userId = this.usersByEmail.get(email);
    const user = userId ? this.users.get(userId) : null;

    if (user && !user.deletedAt) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      this.resetTokens.set(resetToken, {
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      return {
        accepted: true,
        message: 'If the email exists, a reset link has been dispatched.',
        devToken: resetToken,
      };
    }

    return {
      accepted: true,
      message: 'If the email exists, a reset link has been dispatched.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = this.resetTokens.get(token);
    if (!record || record.expiresAt < new Date()) {
      this.resetTokens.delete(token);
      throw AppError.validationFailed('Invalid or expired password reset token');
    }

    const user = this.users.get(record.userId);
    if (!user) {
      this.resetTokens.delete(token);
      throw AppError.validationFailed('Invalid reset token');
    }

    user.passwordHash = await this.passwordService.hash(newPassword);
    user.updatedAt = new Date();

    await this.signOutEverywhere(record.userId);
    this.resetTokens.delete(token);

    return { success: true, message: 'Password has been reset successfully' };
  }

  async generateMfaSecret(userId: string) {
    const user = this.users.get(userId);
    if (!user) throw AppError.notFound('User not found');

    const secret = this.totpService.generateSecret();
    const otpauthUrl = this.totpService.keyuri(user.email, 'Cahootz', secret);

    return {
      secret,
      otpauthUrl,
    };
  }

  async enableMfa(userId: string, secret: string, code: string) {
    const isValid = this.totpService.verify(code, secret);
    if (!isValid) {
      throw AppError.validationFailed('Invalid verification code');
    }

    const user = this.users.get(userId);
    if (!user) throw AppError.notFound('User not found');

    user.totpSecret = secret;
    user.totpEnabled = true;
    user.updatedAt = new Date();

    return { success: true, message: 'Two-factor authentication successfully enabled' };
  }

  async disableMfa(userId: string, code: string) {
    const user = this.users.get(userId);
    if (!user || !user.totpSecret) {
      throw AppError.validationFailed('MFA is not enabled');
    }

    const isValid = this.totpService.verify(code, user.totpSecret);
    if (!isValid) {
      throw AppError.validationFailed('Invalid verification code');
    }

    user.totpSecret = null;
    user.totpEnabled = false;
    user.updatedAt = new Date();

    return { success: true, message: 'Two-factor authentication successfully disabled' };
  }
}
