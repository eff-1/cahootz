import { type Role } from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../errors/app-error.ts';
import { type TokenService } from '../../modules/identity/token.service.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  institutionId: string | null;
  isMinor: boolean;
  mfaVerified: boolean;
}

export interface HttpAuthRequest {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

export class JwtAuthGuard {
  private readonly tokenService: TokenService;

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
  }

  authenticateRequest(req: HttpAuthRequest): AuthenticatedUser {
    const token = this.extractToken(req);
    if (!token) {
      throw AppError.unauthorized('Authorization token missing.');
    }

    const payload = this.tokenService.verifyAccessToken(token);
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      institutionId: payload.institutionId,
      isMinor: payload.isMinor,
      mfaVerified: payload.mfaVerified,
    };
    req.user = user;
    return user;
  }

  private extractToken(req: HttpAuthRequest): string | undefined {
    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    if (req.cookies?.access_token) {
      return req.cookies.access_token;
    }
    return undefined;
  }
}
