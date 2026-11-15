import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { URL } from 'node:url';
import {
  API_BASE_PATH,
  BRAND_NAME,
  BRAND_PROPOSITION,
  BRAND_TAGLINE,
  ERROR_CODES,
  PILOT_INSTITUTION,
  RATE_LIMITS,
  RELIABILITY_BANDS,
  uuidv7,
} from '../../../packages/shared/src/index.ts';
import { AppError } from './common/errors/app-error.ts';
import { DomainEventBus } from './common/events/domain-events.ts';
import { type AuthenticatedUser } from './common/guards/jwt-auth.guard.ts';
import { SecurityHeadersAndCsrfMiddleware } from './common/middleware/security-headers.middleware.ts';
import { SnapshotBackupService } from './common/backup/snapshot-backup.service.ts';
import { CahootzSqlStore } from './prisma/sql-store.ts';
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
import { renderAccessibleWebPage, renderClientAppJs } from './web-ui.ts';

export interface HttpDispatchRequest {
  method?: string;
  url: string;
  headers?: Record<string, string | undefined>;
  body?: Record<string, any>;
  ip?: string;
}

export interface HttpDispatchResponse<T = any> {
  status: number;
  headers: Record<string, string>;
  body: T;
  contentType?: string;
}

export interface CahootzServerOptions {
  dbPath?: string;
  jwtSecret?: string;
}

export interface CahootzApplicationContext {
  server: Server;
  sqlStore: CahootzSqlStore;
  dispatch: <T = any>(req: HttpDispatchRequest) => Promise<HttpDispatchResponse<T>>;
  syncToSql: () => void;
  close: () => Promise<void>;
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

function sendResponse(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
  contentType = 'application/json; charset=utf-8'
): void {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': String(Buffer.byteLength(payload)),
    ...headers,
  });
  res.end(payload);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = v;
    }
  }
  return out;
}

function formatRefreshCookie(token: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  return `refresh_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=${API_BASE_PATH}/auth; Max-Age=${maxAgeSeconds}`;
}

export function createCahootzHttpServer(
  options: CahootzServerOptions = {}
): CahootzApplicationContext {
  const sqlStore = new CahootzSqlStore(options.dbPath ?? ':memory:');
  const eventBus = new DomainEventBus();
  const emailOutbox = new InMemoryEmailOutbox();
  const passwordService = new PasswordService();
  const tokenService = new TokenService(options.jwtSecret);
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

  // Hydrate state from SQLite database if existing rows exist on disk
  function hydrateFromSql(): void {
    const snap = sqlStore.exportSnapshot();
    identityService.hydrateFromSql(
      snap.tables.users.map((r: any) => ({
        id: r.id,
        email: r.email,
        passwordHash: r.password_hash,
        dateOfBirth: new Date(r.date_of_birth),
        isVerified: Boolean(r.is_verified),
        isStaff: Boolean(r.is_staff),
        totpSecret: r.totp_secret,
        totpEnabled: Boolean(r.totp_enabled),
        roles: JSON.parse(r.roles_json),
        profile: JSON.parse(r.profile_json),
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
        deletedAt: r.deleted_at ? new Date(r.deleted_at) : null,
      })),
      snap.tables.auth_sessions.map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        refreshTokenHash: s.refresh_token_hash,
        deviceName: s.device_name,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        isRevoked: Boolean(s.is_revoked),
        expiresAt: new Date(s.expires_at),
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
      }))
    );

    studentsService.hydrateFromSql(
      snap.tables.student_profiles.map((p: any) => ({
        userId: p.user_id,
        institutionId: p.institution_id,
        orgUnitId: p.org_unit_id,
        programmeId: p.programme_id,
        levelId: p.level_id,
        displayName: p.display_name,
        bio: p.bio,
        studyGoals: JSON.parse(p.study_goals_json),
        preferredModes: JSON.parse(p.preferred_modes_json),
        availabilityJson: JSON.parse(p.availability_json),
        visibility: p.visibility,
        isDiscoverable: Boolean(p.is_discoverable),
        verificationStatus: p.verification_status,
        institutionalEmail: p.institutional_email,
        onboardingCompletedAt: p.onboarding_completed_at
          ? new Date(p.onboarding_completed_at)
          : null,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      })),
      snap.tables.student_enrolments.map((e: any) => ({
        id: e.id,
        userId: e.user_id,
        courseId: e.course_id,
        termId: e.term_id,
        createdAt: new Date(e.created_at),
      }))
    );

    discoveryService.hydrateFromSql(
      snap.tables.study_invitations.map((i: any) => ({
        id: i.id,
        institutionId: i.institution_id,
        senderId: i.sender_id,
        recipientId: i.recipient_id,
        courseId: i.course_id,
        goal: i.goal,
        proposedStartAt: new Date(i.proposed_start_at),
        durationMinutes: Number(i.duration_minutes),
        mode: i.mode,
        status: i.status,
        idempotencyKey: i.idempotency_key,
        respondedAt: i.responded_at ? new Date(i.responded_at) : null,
        sessionId: i.session_id,
        createdAt: new Date(i.created_at),
        expiresAt: new Date(i.expires_at),
      }))
    );

    studySessionsService.hydrateFromSql(
      snap.tables.study_sessions.map((s: any) => ({
        id: s.id,
        institutionId: s.institution_id,
        courseId: s.course_id,
        hostId: s.host_id,
        partnerId: s.partner_id,
        goal: s.goal,
        mode: s.mode,
        plannedDurationMinutes: Number(s.planned_duration_minutes),
        pingResponseWindowSeconds: Number(s.ping_response_window_seconds),
        state: s.state,
        version: Number(s.version),
        scheduledStartAt: new Date(s.scheduled_start_at),
        startedAt: s.started_at ? new Date(s.started_at) : null,
        pausedAt: s.paused_at ? new Date(s.paused_at) : null,
        pausedDurationSeconds: Number(s.paused_duration_seconds),
        endedAt: s.ended_at ? new Date(s.ended_at) : null,
        idempotencyKey: s.idempotency_key,
        participants: JSON.parse(s.participants_json),
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
      })),
      snap.tables.session_events.map((ev: any) => ({
        id: ev.id,
        sessionId: ev.session_id,
        seq: Number(ev.seq),
        actorId: ev.actor_id,
        eventType: ev.event_type,
        fromState: ev.from_state,
        toState: ev.to_state,
        clientEventId: ev.client_event_id,
        clientSeq: ev.client_seq !== null ? Number(ev.client_seq) : null,
        clientTimestamp: ev.client_timestamp ? new Date(ev.client_timestamp) : null,
        serverTimestamp: new Date(ev.server_timestamp),
        payload: JSON.parse(ev.payload_json),
      })),
      (snap.tables.session_disputes ?? []).map((d: any) => ({
        id: d.id,
        sessionId: d.session_id,
        appellantUserId: d.appellant_user_id,
        reason: d.reason,
        status: d.status,
        resolutionNote: d.resolution_note,
        filedAt: new Date(d.filed_at),
        autoResolveAt: new Date(d.auto_resolve_at),
        resolvedAt: d.resolved_at ? new Date(d.resolved_at) : null,
        resolvedBy: d.resolved_by,
      }))
    );

    walletService.hydrateFromSql(
      snap.tables.xp_ledger.map((x: any) => ({
        id: x.id,
        userId: x.user_id,
        sessionId: x.session_id,
        partnerId: x.partner_id,
        reason: x.reason,
        amount: Number(x.amount),
        idempotencyKey: x.idempotency_key,
        lagosDate: x.lagos_date,
        createdAt: new Date(x.created_at),
      }))
    );

    messagingService.hydrateFromSql(
      snap.tables.direct_messages.map((m: any) => ({
        id: m.id,
        conversationKey: m.conversation_key,
        seq: Number(m.seq),
        senderId: m.sender_id,
        recipientId: m.recipient_id,
        body: m.body,
        clientMessageId: m.client_message_id,
        isRemovedByModeration: Boolean(m.is_removed_by_moderation),
        createdAt: new Date(m.created_at),
      }))
    );

    moderationService.hydrateFromSql(
      snap.tables.audit_log.map((a: any) => ({
        id: a.id,
        seq: Number(a.seq),
        actorId: a.actor_id,
        actorRole: a.actor_role,
        action: a.action,
        targetType: a.target_type,
        targetId: a.target_id,
        metadata: JSON.parse(a.metadata_json),
        createdAt: new Date(a.created_at),
      })),
      (snap.tables.moderation_reports ?? []).map((r: any) => ({
        id: r.id,
        institutionId: r.institution_id,
        reporterId: r.reporter_id,
        targetUserId: r.target_user_id,
        targetType: r.target_type,
        targetId: r.target_id,
        category: r.category,
        description: r.description,
        evidenceSnapshot: JSON.parse(r.evidence_snapshot_json),
        status: r.status,
        slaDueAt: new Date(r.sla_due_at),
        resolvedByModeratorId: r.resolved_by_moderator_id,
        resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
        createdAt: new Date(r.created_at),
      })),
      (snap.tables.sanctions ?? []).map((s: any) => ({
        id: s.id,
        reportId: s.report_id,
        targetUserId: s.target_user_id,
        issuedByModeratorId: s.issued_by_moderator_id,
        action: s.action,
        reason: s.reason,
        expiresAt: s.expires_at ? new Date(s.expires_at) : null,
        isActive: Boolean(s.is_active),
        createdAt: new Date(s.created_at),
      })),
      (snap.tables.appeals ?? []).map((ap: any) => ({
        id: ap.id,
        sanctionId: ap.sanction_id,
        appellantUserId: ap.appellant_user_id,
        reason: ap.reason,
        status: ap.status,
        reviewedByModeratorId: ap.reviewed_by_moderator_id,
        reviewNote: ap.review_note,
        createdAt: new Date(ap.created_at),
        reviewedAt: ap.reviewed_at ? new Date(ap.reviewed_at) : null,
      }))
    );

    communitiesService.hydrateFromSql(
      (snap.tables.community_posts ?? []).map((p: any) => ({
        id: p.id,
        communityId: p.community_id,
        institutionId: p.institution_id,
        courseId: p.course_id,
        authorId: p.author_id,
        title: p.title,
        body: p.body,
        tags: JSON.parse(p.tags_json),
        acceptedAnswerId: p.accepted_answer_id,
        isRemoved: Boolean(p.is_removed),
        createdAt: new Date(p.created_at),
      })),
      (snap.tables.community_answers ?? []).map((ans: any) => ({
        id: ans.id,
        postId: ans.post_id,
        authorId: ans.author_id,
        body: ans.body,
        isAccepted: Boolean(ans.is_accepted),
        isRemoved: Boolean(ans.is_removed),
        createdAt: new Date(ans.created_at),
      }))
    );

    administrationService.hydrateFromSql(
      (snap.tables.sensitive_admin_actions ?? []).map((act: any) => ({
        id: act.id,
        actionType: act.action_type,
        targetId: act.target_id,
        reason: act.reason,
        proposedByStaffId: act.proposed_by_staff_id,
        approvedByStaffId: act.approved_by_staff_id,
        status: act.status,
        createdAt: new Date(act.created_at),
        executedAt: act.executed_at ? new Date(act.executed_at) : null,
      }))
    );

    consentPrivacyService.hydrateFromSql(
      snap.tables.consent_log.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        purpose: c.purpose,
        policyVersion: c.policy_version,
        granted: Boolean(c.granted),
        ipAddress: c.ip_address,
        userAgent: c.user_agent,
        timestamp: new Date(c.timestamp),
      }))
    );
  }

  function syncToSql(): void {
    for (const u of identityService.listAllUsersForPersistence()) {
      sqlStore.saveUser(u);
    }
    for (const s of identityService.listAllSessionsForPersistence()) {
      sqlStore.saveAuthSession(s);
    }
    for (const p of studentsService.listAllProfilesForPersistence()) {
      sqlStore.saveStudentProfile(p);
    }
    for (const e of studentsService.listAllEnrolmentsForPersistence()) {
      sqlStore.saveEnrolment(e);
    }
    for (const inv of discoveryService.listAllInvitationsForPersistence()) {
      sqlStore.saveInvitation(inv);
    }
    for (const sess of studySessionsService.listAllSessionsForPersistence()) {
      sqlStore.saveStudySession(sess);
      const evs = studySessionsService.getSessionEvents(sess.hostId, sess.id);
      for (const ev of evs) {
        sqlStore.appendSessionEvent(ev);
      }
    }
    for (const disp of studySessionsService.listAllDisputesForPersistence()) {
      sqlStore.saveSessionDispute(disp);
    }
    for (const xp of walletService.listAllXpEntriesForPersistence()) {
      sqlStore.appendXpLedger(xp);
    }
    for (const msg of messagingService.listAllMessagesForPersistence()) {
      sqlStore.saveDirectMessage(msg);
    }
    for (const aud of moderationService.listAllAuditLogsForPersistence()) {
      sqlStore.appendAuditLog(aud);
    }
    for (const rep of moderationService.listAllReportsForPersistence()) {
      sqlStore.saveModerationReport(rep);
    }
    for (const sanc of moderationService.listAllSanctionsForPersistence()) {
      sqlStore.saveSanction(sanc);
    }
    for (const app of moderationService.listAllAppealsForPersistence()) {
      sqlStore.saveAppeal(app);
    }
    for (const post of communitiesService.listAllPostsForPersistence()) {
      sqlStore.saveCommunityPost(post);
    }
    for (const ans of communitiesService.listAllAnswersForPersistence()) {
      sqlStore.saveCommunityAnswer(ans);
    }
    for (const act of administrationService.listAllSensitiveActionsForPersistence()) {
      sqlStore.saveSensitiveAdminAction(act);
    }
    for (const con of consentPrivacyService.listAllConsentsForPersistence()) {
      sqlStore.appendConsentLog(con);
    }
    broadcastAllSseSessions();
  }

  hydrateFromSql();

  // Auth rate limit counters
  const loginAttemptsByEmail = new Map<string, number[]>();
  const registerAttemptsByIp = new Map<string, number[]>();
  // Virtual clock offset per session (used only in non-production E2E browser tests)
  const sessionClockOffsetsMs = new Map<string, number>();

  function sessionNow(sessionId: string): Date {
    const offset = sessionClockOffsetsMs.get(sessionId) ?? 0;
    return new Date(Date.now() + offset);
  }

  // Active Server-Sent Events (SSE) clients per sessionId
  const sseClientsBySession = new Map<
    string,
    Set<{ userId: string; res: ServerResponse }>
  >();

  function buildSessionStatePayloadForUser(userId: string, sessionId: string) {
    const now = sessionNow(sessionId);
    const session = studySessionsService.getSessionForParticipant(userId, sessionId);
    const timerSnapshot = studySessionsService.getTimerSnapshot(userId, sessionId, now);
    const pings = studySessionsService.getPingsForParticipant(userId, sessionId);
    const dispute = studySessionsService.getDisputeForSession(userId, sessionId);
    const xp = walletService.getXpBalance(userId);
    const streak = walletService.getStreak(userId);
    const reliability = walletService.getReliability(userId);
    return {
      session,
      timerSnapshot,
      pings,
      dispute,
      studentStats: {
        xp,
        streakDays: streak.currentStreakDays,
        reliabilityBand: reliability.band,
        reliabilityScore: reliability.score,
      },
    };
  }

  function broadcastAllSseSessions(): void {
    for (const [sessionId, clients] of sseClientsBySession.entries()) {
      for (const client of clients) {
        try {
          const payload = buildSessionStatePayloadForUser(client.userId, sessionId);
          client.res.write(`event: state\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch {
          clients.delete(client);
        }
      }
    }
  }

  function checkRateLimit(
    bucketMap: Map<string, number[]>,
    key: string,
    maxCount: number,
    windowMs: number
  ): void {
    const nowMs = Date.now();
    const recent = (bucketMap.get(key) ?? []).filter((ts) => nowMs - ts < windowMs);
    if (recent.length >= maxCount) {
      throw AppError.rateLimited('Too many attempts. Please try again later.');
    }
    recent.push(nowMs);
    bucketMap.set(key, recent);
  }

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

  function requireAuth(headers: Record<string, string>): AuthenticatedUser & { sessionId?: string } {
    const authHeader = headers['authorization'];
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthenticated('Authorization Bearer token required.');
    }
    const token = authHeader.slice(7).trim();
    const payload = tokenService.verify(token);

    if (payload.sessionId && payload.sessionId.startsWith('staff-dev-') && process.env.NODE_ENV !== 'production') {
      return {
        id: payload.sub,
        email: payload.email,
        role: (payload.roles[0] as any) ?? ROLES.MODERATOR,
        institutionId: payload.institutionId ?? pilotSeed.institutionId,
        isMinor: false,
        mfaVerified: true,
        sessionId: payload.sessionId,
      };
    }

    // Server-side revocation check: if session was logged out or revoked, reject access token
    if (payload.sessionId && !identityService.isSessionActive(payload.sessionId)) {
      throw AppError.unauthenticated('Session has been revoked.');
    }

    const info = identityService.getPublicInfo(payload.sub);
    if (!info) {
      throw AppError.unauthenticated('Account not found or deleted.');
    }
    const profile = studentsService.findProfile(payload.sub);
    return {
      id: payload.sub,
      email: payload.email,
      role: (payload.roles[0] as any) ?? 'STUDENT',
      institutionId: profile?.institutionId ?? payload.institutionId ?? null,
      isMinor: info.isRestricted,
      mfaVerified: true,
      sessionId: payload.sessionId,
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
      const rawUrl = req.url ?? (req as { path?: string }).path ?? '/';
      const parsedUrl = new URL(rawUrl, 'http://localhost');
      const pathname = parsedUrl.pathname;
      const body = req.body ?? {};
      const idempotencyKey =
        normHeaders['idempotency-key']?.trim() ||
        (typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : undefined);
      const clientIp = req.ip ?? normHeaders['x-forwarded-for'] ?? '127.0.0.1';

      // ─── Client JS & Accessible Web App Routes (`GET /app.js`, `GET /`, `/onboarding`, etc.) ───
      if (method === 'GET' && pathname === '/app.js') {
        return {
          status: 200,
          headers: responseHeaders,
          body: renderClientAppJs() as unknown as T,
          contentType: 'application/javascript; charset=utf-8',
        };
      }

      if (method === 'GET' && !pathname.startsWith('/api/') && pathname !== '/healthz' && pathname !== '/readyz') {
        const html = renderAccessibleWebPage(pathname);
        if (html) {
          return {
            status: 200,
            headers: responseHeaders,
            body: html as unknown as T,
            contentType: 'text/html; charset=utf-8',
          };
        }
      }

      // ─── Health, Readiness & Observability Probes (`/healthz`, `/readyz`, `/metrics`, `/api/v1/observability/metrics`) ───
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

      if (
        method === 'GET' &&
        (pathname === '/metrics' || pathname === `${API_BASE_PATH}/observability/metrics`)
      ) {
        const tableCounts = sqlStore.getTableRowCounts();
        let activeSseCount = 0;
        for (const set of sseClientsBySession.values()) {
          activeSseCount += set.size;
        }
        const openReports = moderationService
          .listAllReportsForPersistence()
          .filter((r) => r.status === 'OPEN');
        const nowMs = Date.now();
        const slaBreaches = openReports.filter((r) => r.slaDueAt.getTime() < nowMs).length;

        if (pathname === '/metrics') {
          const promLines = [
            '# HELP cahootz_sse_active_connections Active Study Together SSE streams',
            '# TYPE cahootz_sse_active_connections gauge',
            `cahootz_sse_active_connections ${activeSseCount}`,
            '# HELP cahootz_moderation_open_reports Open moderation reports in queue',
            '# TYPE cahootz_moderation_open_reports gauge',
            `cahootz_moderation_open_reports ${openReports.length}`,
            '# HELP cahootz_moderation_sla_breaches Open moderation reports past SLA target',
            '# TYPE cahootz_moderation_sla_breaches gauge',
            `cahootz_moderation_sla_breaches ${slaBreaches}`,
            ...Object.entries(tableCounts).map(
              ([table, count]) => `cahootz_sqlite_table_rows{table="${table}"} ${count}`
            ),
          ];
          return {
            status: 200,
            headers: responseHeaders,
            body: (promLines.join('\n') + '\n') as unknown as T,
            contentType: 'text/plain; version=0.0.4; charset=utf-8',
          };
        }

        return {
          status: 200,
          headers: responseHeaders,
          body: {
            data: {
              activeSseConnections: activeSseCount,
              moderationQueue: {
                openReportsCount: openReports.length,
                slaBreachesCount: slaBreaches,
              },
              sqliteTableRowCounts: tableCounts,
              timestamp: new Date().toISOString(),
            },
          } as T,
        };
      }

      // ─── Auth Routes (`/api/v1/auth/*`) ──────────────────────────
      if (method === 'POST' && pathname === `${API_BASE_PATH}/auth/register`) {
        checkRateLimit(
          registerAttemptsByIp,
          clientIp,
          RATE_LIMITS.REGISTER_ATTEMPTS_PER_HOUR,
          60 * 60 * 1000
        );
        const result = await identityService.register({
          email: String(body.email ?? ''),
          password: String(body.password ?? ''),
          dateOfBirth: String(body.dateOfBirth ?? ''),
        });
        consentPrivacyService.recordConsent(result.userId, {
          purpose: 'PRIVACY_NOTICE_ACK',
          policyVersion: String(body.privacyNoticeVersion ?? 'v1.0-draft'),
          granted: true,
          ipAddress: clientIp,
        });
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/auth/login`) {
        const emailKey = String(body.email ?? '').trim().toLowerCase() || clientIp;
        checkRateLimit(
          loginAttemptsByEmail,
          emailKey,
          RATE_LIMITS.LOGIN_ATTEMPTS_PER_15MIN,
          15 * 60 * 1000
        );
        const result = await identityService.login({
          email: String(body.email ?? ''),
          password: String(body.password ?? ''),
          totpCode: body.totpCode ? String(body.totpCode) : undefined,
        });
        if (result.refreshToken) {
          responseHeaders['Set-Cookie'] = formatRefreshCookie(result.refreshToken);
        }
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/auth/refresh`) {
        const cookies = parseCookies(normHeaders['cookie']);
        const refreshToken = cookies['refresh_token'] || String(body.refreshToken ?? '');
        const result = await identityService.refresh(refreshToken);
        responseHeaders['Set-Cookie'] = formatRefreshCookie(result.refreshToken);
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/auth/logout`) {
        const user = requireAuth(normHeaders);
        if (user.sessionId) {
          await identityService.logout(user.sessionId);
        }
        responseHeaders['Set-Cookie'] = formatRefreshCookie('', 0);
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: { success: true } } as T };
      }

      if (
        method === 'POST' &&
        (pathname === `${API_BASE_PATH}/auth/password/reset-request` ||
          pathname === `${API_BASE_PATH}/auth/recover`)
      ) {
        const result = await identityService.requestPasswordReset(String(body.email ?? ''));
        return {
          status: 202,
          headers: responseHeaders,
          body: { data: { accepted: result.accepted, message: result.message } } as T,
        };
      }

      if (method === 'GET' && pathname === `${API_BASE_PATH}/wallet`) {
        const user = requireAuth(normHeaders);
        const xpBalance = walletService.getXpBalance(user.id);
        const entries = walletService.listXpLedger(user.id);
        return {
          status: 200,
          headers: responseHeaders,
          body: { data: { xpBalance, entries } } as T,
        };
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
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'GET' && pathname === `${API_BASE_PATH}/students/me`) {
        const user = requireAuth(normHeaders);
        const profile = studentsService.findProfile(user.id);
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

      if (method === 'POST' && pathname === `${API_BASE_PATH}/students/block`) {
        const user = requireAuth(normHeaders);
        const block = await studentsService.blockUser(
          user.id,
          String(body.blockedId ?? ''),
          body.reason ? String(body.reason) : undefined
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: block } as T };
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

      if (method === 'GET' && pathname === `${API_BASE_PATH}/discovery/invitations`) {
        const user = requireAuth(normHeaders);
        const items = discoveryService.listInvitationsForUser(user.id, 'all');
        return { status: 200, headers: responseHeaders, body: { data: { items } } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/discovery/invitations`) {
        const user = requireAuth(normHeaders);
        const invitation = await discoveryService.sendInvitation(user.id, {
          recipientId: String(body.recipientId ?? ''),
          courseId: String(body.courseId ?? ''),
          goal: String(body.goal ?? body.proposedGoal ?? ''),
          durationMinutes: body.durationMinutes ?? body.proposedDurationMinutes,
          idempotencyKey,
        });
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: invitation } as T };
      }

      const invRespondMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/discovery/invitations/([^/]+)/respond$`)
      );
      if (method === 'POST' && invRespondMatch) {
        const user = requireAuth(normHeaders);
        const invId = invRespondMatch[1]!;
        const isDecline = body.accept === false || body.decision === 'DECLINE';
        const inv = isDecline
          ? await discoveryService.declineInvitation(user.id, invId)
          : await discoveryService.acceptInvitation(user.id, invId);

        if (!isDecline && !inv.sessionId) {
          const session = await studySessionsService.createSession(inv.senderId, {
            partnerId: inv.recipientId,
            courseId: inv.courseId,
            goal: inv.goal,
            plannedDurationMinutes: inv.durationMinutes,
            idempotencyKey: `inv-session-${inv.id}`,
          });
          discoveryService.attachSessionToInvitation(inv.id, session.id);
        }
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: inv } as T };
      }

      const invGetMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/discovery/invitations/([^/]+)$`)
      );
      if (method === 'GET' && invGetMatch) {
        const user = requireAuth(normHeaders);
        const inv = discoveryService.getInvitationForActor(user.id, invGetMatch[1]!);
        return { status: 200, headers: responseHeaders, body: { data: inv } as T };
      }

      // ─── Study Together Sessions (`/api/v1/sessions/*`) ──────────
      if (method === 'POST' && pathname === `${API_BASE_PATH}/sessions`) {
        const user = requireAuth(normHeaders);
        const session = await studySessionsService.createSession(user.id, {
          partnerId: String(body.partnerId ?? ''),
          courseId: String(body.courseId ?? ''),
          goal: String(body.goal ?? ''),
          plannedDurationMinutes: body.plannedDurationMinutes ?? body.durationMinutes,
          idempotencyKey,
        });
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionStateMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/state$`)
      );
      if (method === 'GET' && sessionStateMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionStateMatch[1]!;
        const now = sessionNow(sessionId);
        const session = studySessionsService.getSessionForParticipant(user.id, sessionId);
        const timerSnapshot = studySessionsService.getTimerSnapshot(user.id, sessionId, now);
        const pings = studySessionsService.getPingsForParticipant(user.id, sessionId);
        const dispute = studySessionsService.getDisputeForSession(user.id, sessionId);
        const xp = walletService.getXpBalance(user.id);
        const streak = walletService.getStreak(user.id);
        const reliability = walletService.getReliability(user.id);

        return {
          status: 200,
          headers: responseHeaders,
          body: {
            data: {
              session,
              timerSnapshot,
              pings,
              dispute,
              studentStats: {
                xp,
                streakDays: streak.currentStreakDays,
                reliabilityBand: reliability.band,
                reliabilityScore: reliability.score,
              },
            },
          } as T,
        };
      }

      const sessionCheckInMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/check-in$`)
      );
      if (method === 'POST' && sessionCheckInMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionCheckInMatch[1]!;
        const now = sessionNow(sessionId);
        const session = await studySessionsService.checkIn(
          user.id,
          sessionId,
          {
            clientEventId: body.clientEventId,
            expectedVersion: body.expectedVersion,
          },
          now
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionHbMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/heartbeat$`)
      );
      if (method === 'POST' && sessionHbMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionHbMatch[1]!;
        const now = sessionNow(sessionId);
        const session = studySessionsService.recordHeartbeat(
          user.id,
          sessionId,
          {
            visibility: body.visibility === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE',
            clientEventId: body.clientEventId,
            clientSeq: typeof body.clientSeq === 'number' ? body.clientSeq : undefined,
            clientTimestamp: body.clientTimestamp ? new Date(body.clientTimestamp) : undefined,
          },
          now
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionPingMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/ping$`)
      );
      if (method === 'POST' && sessionPingMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionPingMatch[1]!;
        const now = sessionNow(sessionId);
        const ping = studySessionsService.sendAccountabilityPing(
          user.id,
          sessionId,
          {
            idempotencyKey,
            clientEventId: body.clientEventId,
          },
          now
        );
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: ping } as T };
      }

      const sessionPingRespondMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/ping/([^/]+)/respond$`)
      );
      if (method === 'POST' && sessionPingRespondMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionPingRespondMatch[1]!;
        const pingId = sessionPingRespondMatch[2]!;
        const now = sessionNow(sessionId);
        const ping = studySessionsService.respondToPing(user.id, sessionId, pingId, now);
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: ping } as T };
      }

      const sessionPauseMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/pause$`)
      );
      if (method === 'POST' && sessionPauseMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionPauseMatch[1]!;
        const now = sessionNow(sessionId);
        const session = studySessionsService.pauseSession(
          user.id,
          sessionId,
          { reason: body.reason },
          now
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionResumeMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/resume$`)
      );
      if (method === 'POST' && sessionResumeMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionResumeMatch[1]!;
        const now = sessionNow(sessionId);
        const session = studySessionsService.resumeSession(user.id, sessionId, {}, now);
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionDisconnectMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/disconnect$`)
      );
      if (method === 'POST' && sessionDisconnectMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionDisconnectMatch[1]!;
        const now = sessionNow(sessionId);
        const session = studySessionsService.reportNetworkDisconnect(user.id, sessionId, now);
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionReconnectMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/reconnect$`)
      );
      if (method === 'POST' && sessionReconnectMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionReconnectMatch[1]!;
        const now = sessionNow(sessionId);
        const result = studySessionsService.reconnectWithResumeToken(
          user.id,
          sessionId,
          String(body.resumeToken ?? ''),
          now
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      const sessionCompleteMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/complete$`)
      );
      if (method === 'POST' && sessionCompleteMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionCompleteMatch[1]!;
        const now = sessionNow(sessionId);
        const session = await studySessionsService.completeSession(
          user.id,
          sessionId,
          { emergencyExitReason: body.emergencyExitReason },
          now
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      const sessionDisputeMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/dispute$`)
      );
      if (method === 'POST' && sessionDisputeMatch) {
        const user = requireAuth(normHeaders);
        const sessionId = sessionDisputeMatch[1]!;
        const now = sessionNow(sessionId);
        const dispute = await studySessionsService.fileDispute(
          user.id,
          sessionId,
          String(body.reason ?? 'Disputed outcome'),
          now
        );
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: dispute } as T };
      }

      const sessionSimClockMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/simulate-clock$`)
      );
      if (method === 'POST' && sessionSimClockMatch && process.env.NODE_ENV !== 'production') {
        const user = requireAuth(normHeaders);
        const sessionId = sessionSimClockMatch[1]!;
        const advanceSeconds = Math.max(0, Number(body.advanceSeconds ?? 0));
        const session = studySessionsService.getSessionForParticipant(user.id, sessionId);
        let remainingSec = advanceSeconds;
        while (remainingSec > 0) {
          const stepSec = Math.min(30, remainingSec);
          const currentOffset = sessionClockOffsetsMs.get(sessionId) ?? 0;
          sessionClockOffsetsMs.set(sessionId, currentOffset + stepSec * 1000);
          remainingSec -= stepSec;
          const tickNow = sessionNow(sessionId);
          for (const part of Object.values(session.participants)) {
            if (part.presenceState === 'PRESENT') {
              studySessionsService.recordHeartbeat(
                part.userId,
                sessionId,
                { visibility: 'VISIBLE' },
                tickNow
              );
            }
          }
        }
        syncToSql();
        return {
          status: 200,
          headers: responseHeaders,
          body: {
            data: {
              sessionId,
              offsetMs: sessionClockOffsetsMs.get(sessionId) ?? 0,
              simulatedNow: sessionNow(sessionId).toISOString(),
            },
          } as T,
        };
      }

      const sessionGetMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)$`)
      );
      if (method === 'GET' && sessionGetMatch) {
        const user = requireAuth(normHeaders);
        const session = studySessionsService.getSessionForParticipant(
          user.id,
          sessionGetMatch[1]!
        );
        return { status: 200, headers: responseHeaders, body: { data: session } as T };
      }

      // ─── Direct Messages (`/api/v1/messages/*`) ──────────────────
      if (method === 'GET' && pathname === `${API_BASE_PATH}/messages`) {
        const user = requireAuth(normHeaders);
        const otherUserId = parsedUrl.searchParams.get('partnerId') ?? undefined;
        const items = messagingService.listMessages(user.id, otherUserId);
        return { status: 200, headers: responseHeaders, body: { data: { items } } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/messages`) {
        const user = requireAuth(normHeaders);
        const msg = await messagingService.sendMessage(user.id, {
          recipientId: String(body.recipientId ?? ''),
          body: String(body.body ?? ''),
          clientMessageId: String(body.clientMessageId ?? idempotencyKey ?? uuidv7()),
        });
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: msg } as T };
      }

      const msgGetMatch = pathname.match(new RegExp(`^${API_BASE_PATH}/messages/([^/]+)$`));
      if (method === 'GET' && msgGetMatch) {
        const user = requireAuth(normHeaders);
        const msg = messagingService.getMessageByIdForActor(user.id, msgGetMatch[1]!);
        return { status: 200, headers: responseHeaders, body: { data: msg } as T };
      }

      // ─── Course Communities (`/api/v1/communities/*`) ────────────
      if (method === 'GET' && pathname === `${API_BASE_PATH}/communities/posts`) {
        const user = requireAuth(normHeaders);
        const courseId =
          parsedUrl.searchParams.get('courseId') ||
          (studentsService.findProfile(user.id)?.courseIds[0] ?? 'course-pilot-csc-301');
        const items = communitiesService.listPostsForCourse(user.id, courseId);
        return { status: 200, headers: responseHeaders, body: { data: { items, courseId } } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/communities/posts`) {
        const user = requireAuth(normHeaders);
        const courseId =
          String(body.courseId ?? '') ||
          (studentsService.findProfile(user.id)?.courseIds[0] ?? 'course-pilot-csc-301');
        const post = communitiesService.createPost(user.id, {
          courseId,
          title: String(body.title ?? ''),
          body: String(body.body ?? ''),
          tags: Array.isArray(body.tags) ? body.tags : ['Q&A'],
        });
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: post } as T };
      }

      const postAnswersMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/communities/posts/([^/]+)/answers$`)
      );
      if (method === 'POST' && postAnswersMatch) {
        const user = requireAuth(normHeaders);
        const answer = communitiesService.createAnswer(
          user.id,
          postAnswersMatch[1]!,
          String(body.body ?? '')
        );
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: answer } as T };
      }

      const acceptAnswerMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/communities/posts/([^/]+)/accept-answer$`)
      );
      if (method === 'POST' && acceptAnswerMatch) {
        const user = requireAuth(normHeaders);
        const post = communitiesService.markAcceptedAnswer(
          user.id,
          acceptAnswerMatch[1]!,
          String(body.answerId ?? '')
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: post } as T };
      }

      // ─── Moderation & Appeals (`/api/v1/moderation/*`) ───────────
      if (method === 'POST' && pathname === `${API_BASE_PATH}/moderation/reports`) {
        const user = requireAuth(normHeaders);
        const report = await moderationService.createReport(user, {
          targetUserId: String(body.targetUserId ?? ''),
          targetType: (body.targetType as any) ?? 'USER',
          targetId: String(body.targetId ?? body.targetUserId ?? ''),
          category: (body.category as any) ?? 'SPAM',
          description: String(body.description ?? 'Student report'),
          evidenceSnapshot: body.evidenceSnapshot ?? { reportedVia: 'student-ui' },
        });
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: report } as T };
      }

      if (method === 'GET' && pathname === `${API_BASE_PATH}/moderation/queue`) {
        const user = requireAuth(normHeaders);
        const status = (parsedUrl.searchParams.get('status') as any) || 'OPEN';
        const reports = moderationService.listQueue(user, status);
        const appeals = moderationService.listAppeals(user);
        return {
          status: 200,
          headers: responseHeaders,
          body: { data: { reports, appeals } } as T,
        };
      }

      const reportSanctionMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/moderation/reports/([^/]+)/sanctions$`)
      );
      if (method === 'POST' && reportSanctionMatch) {
        const user = requireAuth(normHeaders);
        const result = await moderationService.resolveReportWithAction(
          user,
          reportSanctionMatch[1]!,
          {
            action: (body.action as any) ?? 'WARN',
            reason: String(body.reason ?? 'Moderator sanction'),
          }
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: result } as T };
      }

      if (method === 'GET' && pathname === `${API_BASE_PATH}/moderation/my-sanctions`) {
        const user = requireAuth(normHeaders);
        const items = moderationService.listSanctionsForUser(user.id);
        return { status: 200, headers: responseHeaders, body: { data: { items } } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/moderation/appeals`) {
        const user = requireAuth(normHeaders);
        const appeal = moderationService.submitAppeal(
          user.id,
          String(body.sanctionId ?? ''),
          String(body.reason ?? 'Requesting independent review')
        );
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: appeal } as T };
      }

      const appealResolveMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/moderation/appeals/([^/]+)/resolve$`)
      );
      if (method === 'POST' && appealResolveMatch) {
        const user = requireAuth(normHeaders);
        const appeal = moderationService.reviewAppeal(
          user,
          appealResolveMatch[1]!,
          body.decision === 'UPHELD' ? 'UPHELD' : 'OVERTURNED',
          String(body.note ?? 'Reviewed by independent moderator')
        );
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: appeal } as T };
      }

      // ─── Two-Approver Admin Actions (`/api/v1/admin/*`) ──────────
      if (method === 'GET' && pathname === `${API_BASE_PATH}/admin/actions`) {
        const user = requireAuth(normHeaders);
        const items = administrationService.listSensitiveActions(user);
        return { status: 200, headers: responseHeaders, body: { data: { items } } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/admin/actions`) {
        const user = requireAuth(normHeaders);
        const req = administrationService.proposeSensitiveAction(user, {
          actionType: (body.actionType as any) ?? 'DISABLE_SAFETY_KILLSWITCH',
          targetId: String(body.targetId ?? 'MESSAGING_ENABLED'),
          reason: String(body.reason ?? 'Emergency maintenance'),
        });
        syncToSql();
        return { status: 201, headers: responseHeaders, body: { data: req } as T };
      }

      const adminApproveMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/admin/actions/([^/]+)/approve$`)
      );
      if (method === 'POST' && adminApproveMatch) {
        const user = requireAuth(normHeaders);
        const req = administrationService.approveSensitiveAction(user, adminApproveMatch[1]!);
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: req } as T };
      }

      // Test/Dev Staff MFA Token helper (disabled in production)
      if (
        method === 'POST' &&
        pathname === `${API_BASE_PATH}/auth/dev-staff-token` &&
        process.env.NODE_ENV !== 'production'
      ) {
        const staffId = String(body.staffId ?? 'staff-mod-1');
        const role = (body.role as any) ?? ROLES.PLATFORM_MODERATOR;
        const token = tokenService.sign({
          sub: staffId,
          email: `${staffId}@cahootz.ng`,
          roles: [role],
          institutionId: pilotSeed.institutionId,
          sessionId: `staff-dev-${staffId}`,
        });
        return {
          status: 200,
          headers: responseHeaders,
          body: { data: { accessToken: token, user: { id: staffId, role, email: `${staffId}@cahootz.ng` } } } as T,
        };
      }

      // ─── Privacy & Data Rights (`/api/v1/privacy/*`) ─────────────
      if (method === 'GET' && pathname === `${API_BASE_PATH}/privacy/export`) {
        const user = requireAuth(normHeaders);
        const exported = consentPrivacyService.exportUserData(user.id);
        return { status: 200, headers: responseHeaders, body: { data: exported } as T };
      }

      if (method === 'POST' && pathname === `${API_BASE_PATH}/privacy/delete-account`) {
        const user = requireAuth(normHeaders);
        const deletion = await consentPrivacyService.requestAccountDeletion(user.id);
        syncToSql();
        return { status: 200, headers: responseHeaders, body: { data: deletion } as T };
      }

      const exportUserMatch = pathname.match(
        new RegExp(`^${API_BASE_PATH}/privacy/export/([^/]+)$`)
      );
      if (method === 'GET' && exportUserMatch) {
        const user = requireAuth(normHeaders);
        const exported = consentPrivacyService.exportUserDataForActor(
          user.id,
          exportUserMatch[1]!
        );
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
      const parsedReqUrl = new URL(req.url ?? '/', 'http://localhost');
      const sseMatch = parsedReqUrl.pathname.match(
        new RegExp(`^${API_BASE_PATH}/sessions/([^/]+)/stream$`)
      );
      if ((req.method ?? 'GET').toUpperCase() === 'GET' && sseMatch) {
        const sessionId = sseMatch[1]!;
        const queryToken = parsedReqUrl.searchParams.get('token');
        const normHeaders = normalizeHeaders(
          req.headers as Record<string, string | undefined>
        );
        if (queryToken && !normHeaders['authorization']) {
          normHeaders['authorization'] = `Bearer ${queryToken}`;
        }
        const user = requireAuth(normHeaders);
        const initialPayload = buildSessionStatePayloadForUser(user.id, sessionId);

        const sseHeaders: Record<string, string> = {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        };
        securityMiddleware.applyHeaders(sseHeaders);
        res.writeHead(200, sseHeaders);
        res.write(`event: state\ndata: ${JSON.stringify(initialPayload)}\n\n`);

        let clients = sseClientsBySession.get(sessionId);
        if (!clients) {
          clients = new Set();
          sseClientsBySession.set(sessionId, clients);
        }
        const entry = { userId: user.id, res };
        clients.add(entry);

        const keepAliveTimer = setInterval(() => {
          try {
            res.write(': keepalive\n\n');
          } catch {
            clearInterval(keepAliveTimer);
          }
        }, 10_000);
        keepAliveTimer.unref();

        req.on('close', () => {
          clearInterval(keepAliveTimer);
          clients?.delete(entry);
        });
        return;
      }

      const body = await readJsonBody(req);
      const result = await dispatch({
        method: req.method,
        url: req.url ?? '/',
        headers: req.headers as Record<string, string | undefined>,
        body,
        ip: req.socket.remoteAddress ?? '127.0.0.1',
      });
      sendResponse(res, result.status, result.body, result.headers, result.contentType);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        sendResponse(res, err.httpStatus, {
          error: { code: err.code, message: err.message },
        });
      } else {
        sendResponse(res, 500, {
          error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
        });
      }
    }
  });

  async function close(): Promise<void> {
    for (const clients of sseClientsBySession.values()) {
      for (const c of clients) {
        try {
          c.res.end();
        } catch {}
      }
      clients.clear();
    }
    sseClientsBySession.clear();
    syncToSql();
    sqlStore.close();
    if (server.listening) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  }

  return {
    server,
    sqlStore,
    dispatch,
    syncToSql,
    close,
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
