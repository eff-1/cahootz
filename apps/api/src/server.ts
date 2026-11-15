import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { URL } from 'node:url';
import {
  API_BASE_PATH,
  BRAND_NAME,
  ERROR_CODES,
  uuidv7,
} from '../../../packages/shared/src/index.ts';
import { AppError } from './common/errors/app-error.ts';
import { DomainEventBus } from './common/events/domain-events.ts';
import { type AuthenticatedUser } from './common/guards/jwt-auth.guard.ts';
import { SecurityHeadersAndCsrfMiddleware } from './common/middleware/security-headers.middleware.ts';
import { SnapshotBackupService } from './common/backup/snapshot-backup.service.ts';
import { InMemoryEmailOutbox } from './modules/notifications/email.provider.ts';
import { PasswordService } from './modules/identity/password.service.ts';
import { TokenService } from './modules/identity/token.service.ts';
import { TotpService } from './modules/identity/totp.service.ts';
import { IdentityService } from './modules/identity/identity.service.ts';
import { InstitutionsService } from './modules/institutions/institutions.service.ts';
import { StudentsService } from './modules/students/students.service.ts';
import { WalletService } from './modules/wallet/wallet.service.ts';
import { DiscoveryService } from './modules/discovery/discovery.service.ts';
import { StudySessionsService } from './modules/study-sessions/study-sessions.service.ts';
import { ModerationService } from './modules/moderation/moderation.service.ts';
import { MessagingService } from './modules/messaging/messaging.service.ts';
import { CommunitiesService } from './modules/communities/communities.service.ts';
import { AdministrationService } from './modules/administration/administration.service.ts';
import { ConsentPrivacyService } from './modules/consent-privacy/consent-privacy.service.ts';
import { AnalyticsService } from './modules/analytics/analytics.service.ts';
import { seedPilotInstitution, type PilotSeedResult } from './seed/pilot-seed.ts';

export interface HttpDispatchRequest {
  method?: string;
  url: string;
  headers?: Record<string, string | undefined>;
  body?: Record<string, any>;
}

export interface HttpDispatchResponse<T = any> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

export interface CahootzApplicationContext {
  server: Server;
  dispatch: <T = any>(req: HttpDispatchRequest) => Promise<HttpDispatchResponse<T>>;
  eventBus: DomainEventBus;
  emailOutbox: InMemoryEmailOutbox;
  identityService: IdentityService;
  institutionsService: InstitutionsService;
  studentsService: StudentsService;
  walletService: WalletService;
  discoveryService: DiscoveryService;
  studySessionsService: StudySessionsService;
  moderationService: ModerationService;
  messagingService: MessagingService;
  communitiesService: CommunitiesService;
  administrationService: AdministrationService;
  consentPrivacyService: ConsentPrivacyService;
  analyticsService: AnalyticsService;
  backupService: SnapshotBackupService;
  pilotSeed: PilotSeedResult;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > 256 * 1024) {
      throw AppError.validationFailed('Request payload too large (max 256 KB).');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw AppError.validationFailed('Malformed JSON request body.');
  }
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(payload)),
    ...headers,
  });
  res.end(payload);
}

/**
 * Creates a complete, runnable HTTP server wiring all 12 modular-monolith
 * domain services, security headers, correlation IDs, JWT authentication, and
 * standard API error envelopes (`/api/v1/*`).
 */
export function createCahootzHttpServer(): CahootzApplicationContext {
  const eventBus = new DomainEventBus();
  const emailOutbox = new InMemoryEmailOutbox();
  const passwordService = new PasswordService();
  const tokenService = new TokenService();
  const totpService = new TotpService();

  const identityService = new IdentityService(
    passwordService,
    tokenService,
    totpService,
    eventBus
  );
  const institutionsService = new InstitutionsService(eventBus);
  const studentsService = new StudentsService(
    identityService,
    institutionsService,
    emailOutbox,
    eventBus
  );
  const walletService = new WalletService(eventBus);
  const discoveryService = new DiscoveryService(
    studentsService,
    institutionsService,
    eventBus,
    walletService
  );
  const studySessionsService = new StudySessionsService(
    studentsService,
    institutionsService,
    walletService,
    eventBus
  );
  const moderationService = new ModerationService(eventBus);
  const messagingService = new MessagingService(
    identityService,
    studentsService,
    discoveryService,
    studySessionsService,
    moderationService,
    eventBus
  );
  const communitiesService = new CommunitiesService(
    institutionsService,
    studentsService,
    moderationService,
    eventBus
  );
  const administrationService = new AdministrationService(moderationService);
  const consentPrivacyService = new ConsentPrivacyService(
    identityService,
    studentsService,
    walletService,
    eventBus
  );
  const analyticsService = new AnalyticsService(eventBus, studySessionsService);
  const backupService = new SnapshotBackupService();
  const securityMiddleware = new SecurityHeadersAndCsrfMiddleware();

  const pilotSeed = seedPilotInstitution(institutionsService);

  function normalizeHeaders(
    headers: Record<string, string | string[] | undefined> = {}
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        out[k.toLowerCase()] = v;
      } else if (Array.isArray(v) && v[0]) {
        out[k.toLowerCase()] = v[0];
      }
    }
    return out;
  }

  function requireAuth(headers: Record<string, string>): AuthenticatedUser {
    const authHeader = headers['authorization'];
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthenticated('Authorization Bearer token required.');
    }
    const token = authHeader.slice(7).trim();
    const payload = tokenService.verify(token);
    const info = identityService.getPublicInfo(payload.sub);
    const profile = studentsService.findProfile(payload.sub);
    return {
      id: payload.sub,
      email: payload.email,
      role: (payload.roles[0] as any) ?? 'STUDENT',
      institutionId: profile?.institutionId ?? payload.institutionId ?? null,
      isMinor: info?.isRestricted ?? false,
      mfaVerified: true,
    };
  }

  async function dispatch<T = any>(
    req: HttpDispatchRequest
  ): Promise<HttpDispatchResponse<T>> {
    const normHeaders = normalizeHeaders(req.headers);
    const requestId =
      normHeaders['x-request-id'] && normHeaders['x-request-id'].trim()
        ? normHeaders['x-request-id'].trim()
        : uuidv7();

    const responseHeaders: Record<string, string> = {
      'X-Request-Id': requestId,
    };
    securityMiddleware.applyHeaders(responseHeaders);

    try {
      const method = (req.method ?? 'GET').toUpperCase();
      const parsedUrl = new URL(req.url ?? '/', 'http://localhost');
      const pathname = parsedUrl.pathname;
      const body = req.body ?? {};
      const idempotencyKey = normHeaders['idempotency-key']?.trim();

      // ─── Health & Readiness Probes ───────────────────────────────
      if (method === 'GET' && (pathname === '/healthz' || pathname === '/readyz')) {
        return {
          status: 200,
          headers: responseHeaders,
          body: {
            status: 'ok',
            service: `${BRAND_NAME} Modular Monolith API`,
            pilotInstitutionId: pilotSeed.institutionId,
            timestamp: new Date().toISOString(),
          } as T,
        };
      }

      // ─── Auth Routes (`/api/v1/auth/*`) ──────────────────────────
      if (method === 'POST' && pathname === `${API_BASE_PATH}/auth/register`) {
        const result = await identityService.register({
          email: String(body.email ?? ''),
          password: String(body.password ?? ''),
          dateOfBirth: String(body.dateOfBirth ?? ''),
        });
        return { status: 201, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/auth/login`) {
        const result = await identityService.login({
          email: String(body.email ?? ''),
          password: String(body.password ?? ''),
          totpCode: body.totpCode ? String(body.totpCode) : undefined,
        });
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/auth/refresh`) {
        const result = await identityService.refresh(String(body.refreshToken ?? ''));
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      // ─── Institutions & Catalogue (`/api/v1/institutions/*`) ─────
      if (method === 'GET' && pathname === `${API_BASE_PATH}/institutions`) {
        const query = parsedUrl.searchParams.get('q') ?? undefined;
        const items = institutionsService.searchInstitutions(query);
        return { status: 200, headers: responseHeaders, body: { data: { items } } as T };
      }

      const instStructMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/institutions/([^/]+)/structure$`)
      );
      if (method === 'GET' && instStructMatch) {
        const institutionId = instStructMatch[1]!;
        const institution = institutionsService.getInstitution(institutionId);
        const orgTree = institutionsService.getOrgUnitTree(institutionId);
        const programmes = institutionsService.listProgrammes(institutionId);
        const levels = institutionsService.listLevels(institutionId);
        const currentTerm = institutionsService.currentTerm(institutionId);
        const courses = institutionsService.searchCourses(institutionId);
        return {
          status: 200,
          headers: responseHeaders,
          body: {
            data: { institution, orgTree, programmes, levels, currentTerm, courses },
          } as T,
        };
      }

      // ─── Student Onboarding & Profile (`/api/v1/students/*`) ─────
      if (method === 'POST' && pathname === `${API_BASE_PATH}/students/onboarding`) {
        const user = requireAuth(normHeaders);
        const result = await studentsService.completeOnboarding(user.id, {
          institutionId: String(body.institutionId ?? ''),
          orgUnitId: body.orgUnitId,
          programmeId: body.programmeId,
          levelId: body.levelId,
          courseIds: Array.isArray(body.courseIds) ? body.courseIds : [],
          displayName: String(body.displayName ?? ''),
          bio: body.bio,
          studyGoals: body.studyGoals,
          preferredModes: body.preferredModes,
          availabilityJson: body.availabilityJson,
          visibility: body.visibility,
          isDiscoverable: body.isDiscoverable,
        });
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'GET' && pathname === `${API_BASE_PATH}/students/me`) {
        const user = requireAuth(normHeaders);
        const profile = studentsService.getOwnProfile(user.id);
        const courseIds = studentsService.getEnrolledCourseIds(user.id);
        const xp = walletService.getXpBalance(user.id);
        const streak = walletService.getStreak(user.id);
        const reliability = walletService.getReliability(user.id);
        return {
          status: 200,
          headers: responseHeaders,
          body: { data: { profile, courseIds, xp, streak, reliability } } as T,
        };
      }

      // ─── Discovery & Invitations (`/api/v1/discovery/*`) ─────────
      if (method === 'GET' && pathname === `${API_BASE_PATH}/discovery/partners`) {
        const user = requireAuth(normHeaders);
        const courseId = parsedUrl.searchParams.get('courseId') ?? undefined;
        const studyNowOnly = parsedUrl.searchParams.get('studyNowOnly') === 'true';
        const items = discoveryService.discoverPartners(user.id, {
          courseId,
          studyNowOnly,
        });
        return { status: 200, headers: responseHeaders, body: { data: { items } } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/discovery/study-now`) {
        const user = requireAuth(normHeaders);
        const signal = discoveryService.setStudyNowSignal(user.id, {
          courseId: body.courseId,
          goalNote: body.goalNote,
          durationMinutes: body.durationMinutes,
        });
        return { status: 200, headers: responseHeaders, body: { data: signal } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/discovery/invitations`) {
        const user = requireAuth(normHeaders);
        const invitation = await discoveryService.sendInvitation(user.id, {
          recipientId: String(body.recipientId ?? ''),
          courseId: String(body.courseId ?? ''),
          goal: String(body.goal ?? ''),
          durationMinutes: body.durationMinutes,
          idempotencyKey,
        });
        return { status: 201, headers: responseHeaders, body: { data: invitation } as T };
      }

      // ─── Study Together Sessions (`/api/v1/sessions/*`) ──────────
      if (method === 'POST' && pathname === `${API_BASE_PATH}/sessions`) {
        const user = requireAuth(normHeaders);
        const session = await studySessionsService.createSession(user.id, {
          partnerId: String(body.partnerId ?? ''),
          courseId: String(body.courseId ?? ''),
          goal: String(body.goal ?? ''),
          plannedDurationMinutes: body.plannedDurationMinutes,
          idempotencyKey,
        });
        return { status: 201, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionCheckInMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/check-in$`)
      );
      if (method === 'POST' && sessionCheckInMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionCheckInMatch[1]!;
        const session = await studySessionsService.checkIn(user.id, sessionId, {
          clientEventId: body.clientEventId,
          expectedVersion: body.expectedVersion,
        });
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      // ─── Privacy & Data Rights (`/api/v1/privacy/*`) ─────────────
      if (method === 'GET' && pathname === `${API_BASE_PATH}/privacy/export`) {
        const user = requireAuth(normHeaders);
        const exported = consentPrivacyService.exportUserData(user.id);
        return { status: 200, headers: responseHeaders, body: { data: exported } as T };
      }

      // ─── Analytics North Star & Funnel (`/api/v1/analytics/summary`) ───
      if (method === 'GET' && pathname === `${API_BASE_PATH}/analytics/summary`) {
        const northStar = analyticsService.getNorthStarMetric(pilotSeed.institutionId);
        const funnel = analyticsService.getFunnelMetrics();
        return {
          status: 200,
          headers: responseHeaders,
          body: { data: { northStar, funnel } } as T,
        };
      }

      throw AppError.notFound(`Route ${method} ${pathname} not found.`);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        return {
          status: err.httpStatus,
          headers: responseHeaders,
          body: {
            error: {
              code: err.code,
              message: err.message,
              details: err.details ?? null,
              requestId,
            },
          } as T,
        };
      }
      return {
        status: 500,
        headers: responseHeaders,
        body: {
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'An unexpected internal error occurred.',
            requestId,
          },
        } as T,
      };
    }
  }

  const server = createServer(async (req, res) => {
    try {
      const body = await readJsonBody(req);
      const result = await dispatch({
        method: req.method,
        url: req.url ?? '/',
        headers: req.headers as Record<string, string | undefined>,
        body,
      });
      sendJson(res, result.status, result.body, result.headers);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        sendJson(res, err.httpStatus, {
          error: { code: err.code, message: err.message },
        });
      } else {
        sendJson(res, 500, {
          error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
        });
      }
    }
  });

  return {
    server,
    dispatch,
    eventBus,
    emailOutbox,
    identityService,
    institutionsService,
    studentsService,
    walletService,
    discoveryService,
    studySessionsService,
    moderationService,
    messagingService,
    communitiesService,
    administrationService,
    consentPrivacyService,
    analyticsService,
    backupService,
    pilotSeed,
  };
}
