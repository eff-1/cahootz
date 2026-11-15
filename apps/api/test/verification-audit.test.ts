import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createCahootzHttpServer } from '../src/server.ts';
import { CahootzSqlStore } from '../src/prisma/sql-store.ts';
import { PasswordService } from '../src/modules/identity/password.service.ts';
import {
  ALLOWED_TRANSITIONS,
} from '../src/modules/study-sessions/study-sessions.service.ts';
import {
  ERROR_CODES,
  PING_OUTCOMES,
  SESSION_STATES,
} from '../../../packages/shared/src/index.ts';
import { AppError } from '../src/common/errors/app-error.ts';

function createTempSqlitePath(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cahootz-${prefix}-`));
  return path.join(dir, 'cahootz.sqlite');
}

describe('VERIFICATION AUDIT SUITE (Items 1, 2, 3, 4, 7, 9)', () => {
  it('Item 1: SQLite disk persistence survives full API server shutdown and restart', async () => {
    const dbPath = createTempSqlitePath('persist');

    // Boot Server Instance #1
    const server1 = createCahootzHttpServer({ dbPath });
    const instId = server1.pilotSeed.institutionId;
    const courseId = server1.pilotSeed.courses['CSC 301']!;

    // Register User A & User B on Server #1
    const regA = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: {
        email: 'persist.a@live.unilag.edu.ng',
        password: 'StrongPassword123!',
        dateOfBirth: '2003-04-10',
        privacyNoticeVersion: 'v1.0-draft',
      },
    });
    assert.equal(regA.status, 201);
    const userAId = (regA.body as { data: { userId: string } }).data.userId;

    const regB = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: {
        email: 'persist.b@live.unilag.edu.ng',
        password: 'StrongPassword123!',
        dateOfBirth: '2003-07-12',
        privacyNoticeVersion: 'v1.0-draft',
      },
    });
    assert.equal(regB.status, 201);
    const userBId = (regB.body as { data: { userId: string } }).data.userId;

    const loginA = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: 'persist.a@live.unilag.edu.ng', password: 'StrongPassword123!' },
    });
    const tokenA = (loginA.body as { data: { accessToken: string } }).data.accessToken;

    const loginB = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: 'persist.b@live.unilag.edu.ng', password: 'StrongPassword123!' },
    });
    const tokenB = (loginB.body as { data: { accessToken: string } }).data.accessToken;

    // Complete onboarding for both
    await server1.dispatch({
      method: 'POST',
      url: '/api/v1/students/onboarding',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        institutionId: instId,
        displayName: 'Persist A',
        courseIds: [courseId],
      },
    });
    await server1.dispatch({
      method: 'POST',
      url: '/api/v1/students/onboarding',
      headers: { authorization: `Bearer ${tokenB}` },
      body: {
        institutionId: instId,
        displayName: 'Persist B',
        courseIds: [courseId],
      },
    });

    // Send & accept study invitation
    const invRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/discovery/invitations',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        recipientId: userBId,
        courseId,
        goal: 'Solve past questions together',
        durationMinutes: 25,
        idempotencyKey: 'persist-inv-1',
      },
    });
    assert.equal(invRes.status, 201);
    const invId = (invRes.body as { data: { id: string } }).data.id;

    await server1.dispatch({
      method: 'POST',
      url: `/api/v1/discovery/invitations/${invId}/respond`,
      headers: { authorization: `Bearer ${tokenB}` },
      body: { accept: true },
    });

    // Create study session, award XP, send DM
    const sessRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        partnerId: userBId,
        courseId,
        goal: 'Solve past questions together',
        plannedDurationMinutes: 25,
        idempotencyKey: 'persist-sess-1',
      },
    });
    assert.equal(sessRes.status, 201);
    const sessId = (sessRes.body as { data: { id: string } }).data.id;

    await server1.walletService.awardSessionXp({
      userId: userAId,
      partnerId: userBId,
      sessionId: sessId,
      durationMinutes: 50,
      completionType: 'FULL',
    });

    const dmRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/messages',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        recipientId: userBId,
        body: 'Ready for our study block!',
        clientMessageId: 'persist-dm-1',
      },
    });
    assert.equal(dmRes.status, 201);
    const dmId = (dmRes.body as { data: { id: string } }).data.id;

    // Create Community Post & Answer, Moderation Report, Sanction, Appeal & Two-Approver Admin Action on Server #1
    const postRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/communities/posts',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        courseId,
        title: 'How does virtual memory paging work?',
        body: 'Looking for a breakdown of multi-level page tables in CSC 301.',
      },
    });
    assert.equal(postRes.status, 201);
    const postId = (postRes.body as { data: { id: string } }).data.id;

    const ansRes = await server1.dispatch({
      method: 'POST',
      url: `/api/v1/communities/posts/${postId}/answers`,
      headers: { authorization: `Bearer ${tokenB}` },
      body: { body: 'Multi-level page tables split the virtual address into directory and page offsets.' },
    });
    assert.equal(ansRes.status, 201);

    const repRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/moderation/reports',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        targetUserId: userBId,
        targetType: 'USER',
        targetId: userBId,
        category: 'SPAM',
        description: 'Persistence test report',
      },
    });
    assert.equal(repRes.status, 201);
    const repId = (repRes.body as { data: { id: string } }).data.id;

    const mod1TokenRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/auth/dev-staff-token',
      body: { staffId: 'staff-mod-1', role: 'PLATFORM_MODERATOR' },
    });
    const mod1Token = (mod1TokenRes.body as { data: { accessToken: string } }).data.accessToken;

    const sancRes = await server1.dispatch({
      method: 'POST',
      url: `/api/v1/moderation/reports/${repId}/sanctions`,
      headers: { authorization: `Bearer ${mod1Token}` },
      body: { action: 'WARN', reason: 'Persistence warning' },
    });
    assert.equal(sancRes.status, 200);
    const sancId = (sancRes.body as { data: { sanction: { id: string } } }).data.sanction.id;

    const appealRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/moderation/appeals',
      headers: { authorization: `Bearer ${tokenB}` },
      body: { sanctionId: sancId, reason: 'Persistence appeal' },
    });
    assert.equal(appealRes.status, 201);

    const actRes = await server1.dispatch({
      method: 'POST',
      url: '/api/v1/admin/actions',
      headers: { authorization: `Bearer ${mod1Token}` },
      body: { actionType: 'DISABLE_SAFETY_KILLSWITCH', targetId: 'MESSAGING_ENABLED', reason: 'Persist test' },
    });
    assert.equal(actRes.status, 201);

    // Shut down Server #1 completely (syncs & closes SQLite DB)
    await server1.close();

    // Boot a brand-new Server Instance #2 pointing at the same SQLite database file
    const server2 = createCahootzHttpServer({ dbPath });

    // Verify User A's existing accessToken + session is still active after restart
    const walletRes = await server2.dispatch({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(walletRes.status, 200);
    const walletData = (walletRes.body as { data: { xpBalance: number; entries: unknown[] } }).data;
    assert.equal(walletData.xpBalance, 50);
    assert.equal(walletData.entries.length, 1);

    // Verify study session survived restart
    const getSess = await server2.dispatch({
      method: 'GET',
      url: `/api/v1/sessions/${sessId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(getSess.status, 200);
    assert.equal((getSess.body as { data: { id: string } }).data.id, sessId);

    // Verify invitation survived restart
    const getInv = await server2.dispatch({
      method: 'GET',
      url: `/api/v1/discovery/invitations/${invId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(getInv.status, 200);

    // Verify direct message survived restart
    const getDm = await server2.dispatch({
      method: 'GET',
      url: `/api/v1/messages/${dmId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(getDm.status, 200);
    assert.equal((getDm.body as { data: { body: string } }).data.body, 'Ready for our study block!');

    // Verify Community Posts & Answers survived restart
    const getPosts = await server2.dispatch({
      method: 'GET',
      url: `/api/v1/communities/posts?courseId=${courseId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(getPosts.status, 200);
    const postsItems = (getPosts.body as { data: { items: Array<{ id: string; answers: unknown[] }> } }).data.items;
    assert.equal(postsItems.length, 1);
    assert.equal(postsItems[0]!.answers.length, 1);

    // Verify Moderation Sanctions, Appeals, and Two-Approver Actions survived restart
    const getModQueue = await server2.dispatch({
      method: 'GET',
      url: '/api/v1/moderation/queue?status=RESOLVED',
      headers: { authorization: `Bearer ${mod1Token}` },
    });
    assert.equal(getModQueue.status, 200);
    const modQueueData = (getModQueue.body as { data: { reports: unknown[]; appeals: unknown[] } }).data;
    assert.equal(modQueueData.reports.length, 1);
    assert.equal(modQueueData.appeals.length, 1);

    const getAdminActs = await server2.dispatch({
      method: 'GET',
      url: '/api/v1/admin/actions',
      headers: { authorization: `Bearer ${mod1Token}` },
    });
    assert.equal(getAdminActs.status, 200);
    assert.equal((getAdminActs.body as { data: { items: unknown[] } }).data.items.length, 1);

    // Verify /metrics and /api/v1/observability/metrics reject unauthenticated requests with 401
    const unauthMetrics = await server2.dispatch({ method: 'GET', url: '/metrics' });
    assert.equal(unauthMetrics.status, 401);
    const unauthJsonMetrics = await server2.dispatch({ method: 'GET', url: '/api/v1/observability/metrics' });
    assert.equal(unauthJsonMetrics.status, 401);

    // Verify /metrics (Prometheus) and /api/v1/observability/metrics (JSON) report all 18 SQLite tables with Bearer token
    const promMetrics = await server2.dispatch({
      method: 'GET',
      url: '/metrics',
      headers: { authorization: 'Bearer cahootz-metrics-secret-token' },
    });
    assert.equal(promMetrics.status, 200);
    assert.ok(String(promMetrics.body).includes('cahootz_sqlite_table_rows{table="community_posts"} 1'));
    assert.ok(String(promMetrics.body).includes('cahootz_sqlite_table_rows{table="sanctions"} 1'));

    const jsonMetrics = await server2.dispatch({
      method: 'GET',
      url: '/api/v1/observability/metrics',
      headers: { authorization: 'Bearer cahootz-metrics-secret-token' },
    });
    assert.equal(jsonMetrics.status, 200);
    const counts = (jsonMetrics.body as { data: { sqliteTableRowCounts: Record<string, number> } }).data.sqliteTableRowCounts;
    assert.equal(Object.keys(counts).length, 18);
    assert.equal(counts.community_posts, 1);
    assert.equal(counts.community_answers, 1);
    assert.equal(counts.moderation_reports, 1);
    assert.equal(counts.sanctions, 1);
    assert.equal(counts.appeals, 1);
    assert.equal(counts.sensitive_admin_actions, 1);

    await server2.close();
  });

  it('Item 1b: Crash resilience — killing the server process with SIGKILL immediately after an acknowledged write preserves data on restart without loss', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cahootz-crash-kill-'));
    const dbPath = path.join(dir, 'cahootz.sqlite');
    const metaPath = path.join(dir, 'meta.json');

    // Spawn server child process
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', 'apps/api/test/crash-server.ts'],
      {
        env: { ...process.env, CRASH_DB_PATH: dbPath, CRASH_META_PATH: metaPath, NODE_ENV: 'test' },
        stdio: 'inherit',
      }
    );

    const exitPromise = new Promise<{ code: number | null; signal: string | null }>((resolve) => {
      child.on('exit', (code, signal) => resolve({ code, signal }));
    });

    await exitPromise;

    assert.ok(fs.existsSync(metaPath), 'Metadata must have been written before kill');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    // Boot fresh server on the SQLite database
    const recoveredServer = createCahootzHttpServer({ dbPath });

    const hostProfile = recoveredServer.studentsService.findProfile(meta.hostId);
    assert.ok(hostProfile, 'Host profile must exist after SIGKILL crash recovery');
    assert.equal(hostProfile?.displayName, 'Host Crasher');

    const session = recoveredServer.studySessionsService.getSessionForParticipant(meta.hostId, meta.sessionId);
    assert.ok(session, 'Study session must exist after SIGKILL crash recovery');
    assert.equal(session?.id, meta.sessionId);
    assert.ok(session?.state, 'Session must have valid state');
    assert.equal(session?.participants[meta.hostId]?.presenceState, 'PRESENT');

    const recoveredMsg = recoveredServer.messagingService.getMessageByIdForActor(meta.hostId, meta.dmId);
    assert.ok(recoveredMsg, 'Direct message must survive SIGKILL crash');
    assert.equal(recoveredMsg?.body, 'Pre-crash direct message that must survive SIGKILL!');

    await recoveredServer.close();
  });

  it('Item 2: Auth matches spec (Argon2id, short-lived JWT, rotating refresh in HttpOnly+Secure+SameSite cookie, server-side revocation, uniform errors, rate limits)', async () => {
    const dbPath = createTempSqlitePath('auth');
    const server = createCahootzHttpServer({ dbPath });

    // 2a. Argon2id hash format check
    const passwordService = new PasswordService();
    const phc = await passwordService.hash('MySecretPass123!');
    assert.equal(
      phc.startsWith('$argon2id$v=19$m=19456,t=2,p=1$'),
      true,
      `Expected Argon2id PHC string, got: ${phc}`
    );
    assert.equal(await passwordService.verify(phc, 'MySecretPass123!'), true);
    assert.equal(await passwordService.verify(phc, 'WrongPass123!'), false);

    // 2b. Register & Login sets HttpOnly, Secure, SameSite=Strict cookie
    await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: {
        email: 'auth.spec@live.unilag.edu.ng',
        password: 'StrongPassword123!',
        dateOfBirth: '2002-05-20',
      },
    });

    const loginRes = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: 'auth.spec@live.unilag.edu.ng', password: 'StrongPassword123!' },
    });
    assert.equal(loginRes.status, 200);
    const setCookieHeader = String(loginRes.headers['Set-Cookie'] ?? loginRes.headers['set-cookie'] ?? '');
    assert.match(setCookieHeader, /refresh_token=([^;]+)/);
    assert.match(setCookieHeader, /HttpOnly/i);
    assert.match(setCookieHeader, /Secure/i);
    assert.match(setCookieHeader, /SameSite=Strict/i);

    const cookieMatch = setCookieHeader.match(/refresh_token=([^;]+)/);
    assert.ok(cookieMatch);
    const refreshCookie1 = decodeURIComponent(cookieMatch[1]!);

    // 2c. Rotating refresh token via Cookie header
    const refreshRes = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: `refresh_token=${encodeURIComponent(refreshCookie1)}` },
      body: {},
    });
    assert.equal(refreshRes.status, 200);
    const setCookieHeader2 = String(refreshRes.headers['Set-Cookie'] ?? refreshRes.headers['set-cookie'] ?? '');
    const cookieMatch2 = setCookieHeader2.match(/refresh_token=([^;]+)/);
    assert.ok(cookieMatch2);
    const refreshCookie2 = decodeURIComponent(cookieMatch2[1]!);
    assert.notEqual(refreshCookie2, refreshCookie1);
    const accessTokenAfterRefresh = (refreshRes.body as { data: { accessToken: string } }).data.accessToken;

    // 2d. Server-side revocation on logout invalidates the active session immediately
    const beforeLogout = await server.dispatch({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { authorization: `Bearer ${accessTokenAfterRefresh}` },
    });
    assert.equal(beforeLogout.status, 200);

    const logoutRes = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${accessTokenAfterRefresh}` },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogout = await server.dispatch({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { authorization: `Bearer ${accessTokenAfterRefresh}` },
    });
    assert.equal(afterLogout.status, 401, 'Access token for revoked session must return 401');

    // 2e. Uniform login & recovery error messages (no account enumeration)
    const badUserLogin = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: 'nonexistent@live.unilag.edu.ng', password: 'WrongPassword123!' },
    });
    const badPassLogin = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: 'auth.spec@live.unilag.edu.ng', password: 'WrongPassword123!' },
    });
    assert.equal(badUserLogin.status, 401);
    assert.equal(badPassLogin.status, 401);
    assert.equal(
      (badUserLogin.body as { error: { message: string } }).error.message,
      (badPassLogin.body as { error: { message: string } }).error.message
    );

    const recExisting = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/recover',
      body: { email: 'auth.spec@live.unilag.edu.ng' },
    });
    const recMissing = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/recover',
      body: { email: 'nobody@live.unilag.edu.ng' },
    });
    assert.deepEqual(recExisting.body, recMissing.body);

    // 2f. Rate limits on login (5 per 15 min -> 6th returns 429)
    for (let i = 0; i < 5; i++) {
      const r = await server.dispatch({
        method: 'POST',
        url: '/api/v1/auth/login',
        body: { email: 'ratelimit.target@live.unilag.edu.ng', password: 'WrongPassword123!' },
      });
      assert.equal(r.status, 401);
    }
    const sixthAttempt = await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: 'ratelimit.target@live.unilag.edu.ng', password: 'WrongPassword123!' },
    });
    assert.equal(sixthAttempt.status, 429);

    await server.close();
  });

  it('Item 3: Per-object Authorization (BOLA/IDOR): User A requesting User B session, invitation, message, and export each returns 403/404', async () => {
    const dbPath = createTempSqlitePath('bola');
    const server = createCahootzHttpServer({ dbPath });

    const instId = server.pilotSeed.institutionId;
    const courseId = server.pilotSeed.courses['CSC 301']!;

    // Register User A (attacker), User B (victim), User C (User B's study partner)
    const users = ['user.a', 'user.b', 'user.c'];
    const tokens: Record<string, string> = {};
    const ids: Record<string, string> = {};

    for (const u of users) {
      const reg = await server.dispatch({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-forwarded-for': `10.20.30.${u}` },
        body: {
          email: `${u}@live.unilag.edu.ng`,
          password: 'StrongPassword123!',
          dateOfBirth: '2003-03-10',
        },
      });
      assert.equal(reg.status, 201);
      ids[u] = (reg.body as { data: { userId: string } }).data.userId;

      const login = await server.dispatch({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': `10.20.30.${u}` },
        body: { email: `${u}@live.unilag.edu.ng`, password: 'StrongPassword123!' },
      });
      tokens[u] = (login.body as { data: { accessToken: string } }).data.accessToken;

      await server.dispatch({
        method: 'POST',
        url: '/api/v1/students/onboarding',
        headers: { authorization: `Bearer ${tokens[u]}` },
        body: { institutionId: instId, displayName: u.toUpperCase(), courseIds: [courseId] },
      });
    }

    // User B sends invitation to User C and User C accepts
    const invBC = await server.dispatch({
      method: 'POST',
      url: '/api/v1/discovery/invitations',
      headers: { authorization: `Bearer ${tokens['user.b']}` },
      body: {
        recipientId: ids['user.c'],
        courseId,
        goal: 'Private B-C study session',
        durationMinutes: 25,
        idempotencyKey: 'bola-inv-bc',
      },
    });
    assert.equal(invBC.status, 201);
    const invIdBC = (invBC.body as { data: { id: string } }).data.id;

    await server.dispatch({
      method: 'POST',
      url: `/api/v1/discovery/invitations/${invIdBC}/respond`,
      headers: { authorization: `Bearer ${tokens['user.c']}` },
      body: { accept: true },
    });

    // User B creates session with User C
    const sessBC = await server.dispatch({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: { authorization: `Bearer ${tokens['user.b']}` },
      body: {
        partnerId: ids['user.c'],
        courseId,
        goal: 'Private B-C study session',
        plannedDurationMinutes: 25,
        idempotencyKey: 'bola-sess-bc',
      },
    });
    assert.equal(sessBC.status, 201);
    const sessIdBC = (sessBC.body as { data: { id: string } }).data.id;

    // User B sends DM to User C
    const msgBC = await server.dispatch({
      method: 'POST',
      url: '/api/v1/messages',
      headers: { authorization: `Bearer ${tokens['user.b']}` },
      body: {
        recipientId: ids['user.c'],
        body: 'Confidential study notes link',
        clientMessageId: 'bola-msg-bc',
      },
    });
    assert.equal(msgBC.status, 201);
    const msgIdBC = (msgBC.body as { data: { id: string } }).data.id;

    // NOW: User A attempts to access User B's session, invitation, message, and data export
    const attackSession = await server.dispatch({
      method: 'GET',
      url: `/api/v1/sessions/${sessIdBC}`,
      headers: { authorization: `Bearer ${tokens['user.a']}` },
    });
    assert.equal(
      attackSession.status === 403 || attackSession.status === 404,
      true,
      `Expected 403/404 for User A reading User B session, got ${attackSession.status}`
    );

    const attackInvitation = await server.dispatch({
      method: 'GET',
      url: `/api/v1/discovery/invitations/${invIdBC}`,
      headers: { authorization: `Bearer ${tokens['user.a']}` },
    });
    assert.equal(
      attackInvitation.status === 403 || attackInvitation.status === 404,
      true,
      `Expected 403/404 for User A reading User B invitation, got ${attackInvitation.status}`
    );

    const attackMessage = await server.dispatch({
      method: 'GET',
      url: `/api/v1/messages/${msgIdBC}`,
      headers: { authorization: `Bearer ${tokens['user.a']}` },
    });
    assert.equal(
      attackMessage.status === 403 || attackMessage.status === 404,
      true,
      `Expected 403/404 for User A reading User B message, got ${attackMessage.status}`
    );

    const attackExport = await server.dispatch({
      method: 'GET',
      url: `/api/v1/privacy/export/${ids['user.b']}`,
      headers: { authorization: `Bearer ${tokens['user.a']}` },
    });
    assert.equal(
      attackExport.status === 403 || attackExport.status === 404,
      true,
      `Expected 403/404 for User A requesting User B data export, got ${attackExport.status}`
    );

    await server.close();
  });

  it('Item 4: Study Together exhaustive checks: (a) all 121 valid/invalid transitions, (b) 3-min disconnect = 0 penalty, (c) <2s timer sync, (d) duplicate & out-of-order events, (e) ping idempotency, (f) same-pair XP farming cap', async () => {
    const server = createCahootzHttpServer();
    const instId = server.pilotSeed.institutionId;
    const courseId = server.pilotSeed.courses['CSC 301']!;

    const u1 = await server.identityService.register({
      email: 'st.u1@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-01-10',
    });
    const u2 = await server.identityService.register({
      email: 'st.u2@gmail.com',
      password: 'StrongPassword123!',
      dateOfBirth: '2003-05-15',
    });
    await server.studentsService.completeOnboarding(u1.userId, {
      institutionId: instId,
      displayName: 'ST User 1',
      courseIds: [courseId],
    });
    await server.studentsService.completeOnboarding(u2.userId, {
      institutionId: instId,
      displayName: 'ST User 2',
      courseIds: [courseId],
    });

    const svc = server.studySessionsService;
    const allStates = Object.values(SESSION_STATES);
    assert.equal(allStates.length, 11);

    let validTested = 0;
    let invalidTested = 0;

    // 4(a): Test every (fromState, toState) pair across all 11x11 = 121 combinations
    for (const fromState of allStates) {
      const allowedTargets = ALLOWED_TRANSITIONS[fromState];
      for (const toState of allStates) {
        const s = await svc.createSession(u1.userId, {
          partnerId: u2.userId,
          courseId,
          goal: 'Exhaustive transition matrix check',
          plannedDurationMinutes: 30,
          idempotencyKey: `idem-${fromState}-${toState}`,
        });
        // Set initial state for direct transition test
        s.state = fromState;

        if (allowedTargets.includes(toState)) {
          const updated = svc.requestTransition(u1.userId, s.id, toState);
          assert.equal(updated.state, toState);
          validTested++;
        } else {
          assert.throws(
            () => svc.requestTransition(u1.userId, s.id, toState),
            (err: unknown) => err instanceof AppError && err.code === ERROR_CODES.INVALID_STATE
          );
          invalidTested++;
        }
      }
    }
    assert.equal(validTested, 27, 'Expected 27 valid state transitions in 11-state machine');
    assert.equal(invalidTested, 94, 'Expected 94 invalid state transitions in 11-state machine');
    assert.equal(validTested + invalidTested, 121, 'All 121 state pairs tested');

    // 4(b): 3-minute technical disconnect = zero penalty & 100% reliability
    const t0 = new Date('2026-11-15T10:00:00Z');
    const fairSess = await svc.createSession(
      u1.userId,
      {
        partnerId: u2.userId,
        courseId,
        goal: 'Fairness 3m disconnect',
        plannedDurationMinutes: 30,
        idempotencyKey: 'idem-fair-audit',
      },
      t0
    );
    await svc.checkIn(u1.userId, fairSess.id, {}, t0);
    await svc.checkIn(u2.userId, fairSess.id, {}, t0);
    assert.equal(fairSess.state, SESSION_STATES.ACTIVE);

    for (let m = 1; m <= 15; m++) {
      const tick = new Date(t0.getTime() + m * 30 * 1000);
      svc.recordHeartbeat(u1.userId, fairSess.id, { visibility: 'VISIBLE' }, tick);
      svc.recordHeartbeat(u2.userId, fairSess.id, { visibility: 'VISIBLE' }, tick);
    }

    const tDisc = new Date(t0.getTime() + 450 * 1000);
    svc.reportNetworkDisconnect(u2.userId, fairSess.id, tDisc);

    // Ping arrives while u2 is disconnected -> classified as MISSED_DISCONNECTED upon window/completion
    const tPing = new Date(t0.getTime() + 480 * 1000);
    const fairPing = svc.sendAccountabilityPing(
      u1.userId,
      fairSess.id,
      { idempotencyKey: 'ping-during-3m-drop' },
      tPing
    );

    // Reconnect 3 minutes (180s) later
    const tRec = new Date(t0.getTime() + 630 * 1000);
    const resumeToken = fairSess.participants[u2.userId]!.resumeToken;
    svc.reconnectWithResumeToken(u2.userId, fairSess.id, resumeToken, tRec);

    for (let sec = 660; sec <= 1800; sec += 30) {
      const tick = new Date(t0.getTime() + sec * 1000);
      svc.recordHeartbeat(u1.userId, fairSess.id, { visibility: 'VISIBLE' }, tick);
      svc.recordHeartbeat(u2.userId, fairSess.id, { visibility: 'VISIBLE' }, tick);
    }

    const completedFair = await svc.completeSession(
      u1.userId,
      fairSess.id,
      {},
      new Date(t0.getTime() + 1800 * 1000)
    );
    assert.equal(fairPing.outcome, PING_OUTCOMES.MISSED_DISCONNECTED);
    assert.equal(completedFair.state, SESSION_STATES.COMPLETED);
    assert.equal(completedFair.participants[u2.userId]!.completionStatus, 'FULL');
    assert.equal(server.walletService.getReliability(u2.userId).score, 100);

    // 4(c): Timer within 2s across two clients (authoritative server clock)
    const syncA = svc.getTimerSnapshot(
      u1.userId,
      fairSess.id,
      new Date(t0.getTime() + 900 * 1000),
      new Date(t0.getTime() + 925 * 1000)
    );
    const syncB = svc.getTimerSnapshot(
      u2.userId,
      fairSess.id,
      new Date(t0.getTime() + 900 * 1000),
      new Date(t0.getTime() + 880 * 1000)
    );
    assert.equal(Math.abs(syncA.remainingSeconds - syncB.remainingSeconds) <= 2, true);

    // 4(d) & 4(e): Duplicate and out-of-order events + Ping idempotency key deduplication
    const activeSess = await svc.createSession(
      u1.userId,
      {
        partnerId: u2.userId,
        courseId,
        goal: 'Ping & Heartbeat idempotency check',
        plannedDurationMinutes: 30,
        idempotencyKey: 'idem-ping-sess',
      },
      t0
    );
    await svc.checkIn(u1.userId, activeSess.id, {}, t0);
    await svc.checkIn(u2.userId, activeSess.id, {}, t0);

    const t30 = new Date(t0.getTime() + 30_000);
    svc.recordHeartbeat(
      u1.userId,
      activeSess.id,
      { clientEventId: 'evt-dup-1', clientSeq: 2, clientTimestamp: t30 },
      t30
    );
    const secAfterFirst = activeSess.participants[u1.userId]!.connectedSeconds;
    svc.recordHeartbeat(
      u1.userId,
      activeSess.id,
      { clientEventId: 'evt-dup-1', clientSeq: 2, clientTimestamp: t30 },
      new Date(t0.getTime() + 45_000)
    );
    assert.equal(activeSess.participants[u1.userId]!.connectedSeconds, secAfterFirst);

    svc.recordHeartbeat(
      u1.userId,
      activeSess.id,
      { clientEventId: 'evt-older', clientSeq: 1, clientTimestamp: new Date(t0.getTime() + 5_000) },
      t30
    );
    const evs = svc.getSessionEvents(u1.userId, activeSess.id);
    assert.ok(evs.some((e) => e.eventType === 'heartbeat.out_of_order_ignored'));

    const p1 = svc.sendAccountabilityPing(u1.userId, activeSess.id, {
      idempotencyKey: 'same-ping-key',
    });
    const p2 = svc.sendAccountabilityPing(u1.userId, activeSess.id, {
      idempotencyKey: 'same-ping-key',
    });
    assert.equal(p1.id, p2.id);

    // 4(f): Same-pair XP farming cap (0.5^n diminishing returns + 500 XP daily cap)
    const day = new Date('2026-11-16T10:00:00Z');
    const awards: number[] = [];
    for (let i = 1; i <= 4; i++) {
      const res = await server.walletService.awardSessionXp({
        userId: u1.userId,
        partnerId: u2.userId,
        sessionId: `farm-sess-${i}`,
        durationMinutes: 50,
        completionType: 'FULL',
        now: day,
      });
      awards.push(res.entry.amount);
    }
    assert.deepEqual(awards, [50, 25, 13, 6]);

    await server.close();
  });

  it('Item 7: Backup then Restore drill into a clean database matches 100% (including off-site AES-256-GCM S3 copy)', async () => {
    const sourceDbPath = createTempSqlitePath('backup-src');
    const cleanDbPath = createTempSqlitePath('restore-dst');
    const offsiteCleanDbPath = createTempSqlitePath('s3-restore-dst');

    const server = createCahootzHttpServer({ dbPath: sourceDbPath });
    await server.dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: {
        email: 'backup.user@live.unilag.edu.ng',
        password: 'StrongPassword123!',
        dateOfBirth: '2001-09-01',
        privacyNoticeVersion: 'v1.0-draft',
      },
    });
    const snapshotFromSource = server.sqlStore.exportSnapshot();
    await server.close();

    // 7a. Local Snapshot Restore into a brand-new, clean database
    const cleanStore = new CahootzSqlStore(cleanDbPath);
    cleanStore.restoreSnapshotIntoCleanDb(snapshotFromSource);
    const snapshotFromRestored = cleanStore.exportSnapshot();
    cleanStore.close();

    assert.deepEqual(snapshotFromRestored.tables, snapshotFromSource.tables);
    assert.equal(snapshotFromRestored.tables.users.length, 1);
    assert.equal(snapshotFromRestored.tables.consent_log.length, 1);

    // 7b. Off-site Encrypted S3-compatible Backup & Restore Drill
    const { S3EncryptedBackupService, InMemoryS3Adapter, AwsS3CompatibleAdapter } = await import(
      '../src/common/backup/s3-encrypted-backup.service.ts'
    );
    const mockS3 = new InMemoryS3Adapter();
    const s3Service = new S3EncryptedBackupService({ storage: mockS3 });

    // Create & upload off-site encrypted backup
    const backupResult = await s3Service.createAndUploadBackup(sourceDbPath, 'backups/prod-drill.enc.json');
    assert.equal(backupResult.backupKey, 'backups/prod-drill.enc.json');
    assert.ok(backupResult.sha256);

    // Verify raw S3 payload is strongly encrypted (AES-256-GCM)
    const rawS3Buf = await mockS3.getObject('backups/prod-drill.enc.json');
    const bundle = JSON.parse(rawS3Buf.toString('utf8'));
    assert.equal(bundle.algorithm, 'aes-256-gcm');
    assert.equal(bundle.version, '2.0-enc');
    assert.ok(bundle.iv && bundle.authTag && bundle.ciphertext);

    // Verify tampering detection (tamper with 1 character of ciphertext)
    const tamperedBundle = {
      ...bundle,
      ciphertext: 'A' + bundle.ciphertext.slice(1),
    };
    await mockS3.putObject('backups/tampered.enc.json', Buffer.from(JSON.stringify(tamperedBundle)));
    await assert.rejects(
      () => s3Service.downloadAndRestore('backups/tampered.enc.json', offsiteCleanDbPath),
      /Backup decryption or AEAD auth tag verification failed/
    );

    // Restore from clean off-site copy into a fresh database
    const restoreResult = await s3Service.downloadAndRestore('backups/prod-drill.enc.json', offsiteCleanDbPath);
    assert.equal(restoreResult.restored, true);
    assert.equal(restoreResult.sha256, backupResult.sha256);

    const offsiteRestoredStore = new CahootzSqlStore(offsiteCleanDbPath);
    const offsiteSnapshot = offsiteRestoredStore.exportSnapshot();
    offsiteRestoredStore.close();

    assert.deepEqual(offsiteSnapshot.tables, snapshotFromSource.tables);

    // 7c. AWS SigV4 adapter header verification
    let capturedReqHeaders: Record<string, string> = {};
    const mockAwsFetch: typeof fetch = async (input, init) => {
      capturedReqHeaders = init?.headers as Record<string, string>;
      return new Response(Buffer.from('ok'), { status: 200, headers: { etag: 'test-etag' } });
    };

    const awsAdapter = new AwsS3CompatibleAdapter({
      endpoint: 'https://s3.af-south-1.amazonaws.com',
      bucket: 'cahootz-backups',
      region: 'af-south-1',
      accessKeyId: 'AKIA_TEST_KEY',
      secretAccessKey: 'test-secret-key-12345',
      fetchFn: mockAwsFetch,
    });

    await awsAdapter.putObject('test.txt', Buffer.from('hello-offsite'));
    assert.ok(capturedReqHeaders['x-amz-date']);
    assert.ok(capturedReqHeaders['x-amz-content-sha256']);
    assert.match(capturedReqHeaders['Authorization'], /AWS4-HMAC-SHA256 Credential=AKIA_TEST_KEY/);
  });

  it('Item 9: Audit log and XP ledger rows cannot be updated or deleted at the SQLite database engine level', () => {
    const dbPath = createTempSqlitePath('immutable');
    const store = new CahootzSqlStore(dbPath);

    store.appendAuditLog({
      id: 'audit-row-1',
      seq: 1,
      actorId: 'admin-1',
      actorRole: 'MODERATOR',
      action: 'WARN_USER',
      targetType: 'USER',
      targetId: 'u-1',
      metadata: { reason: 'Initial warning' },
      createdAt: new Date(),
    });

    store.appendXpLedger({
      id: 'xp-row-1',
      userId: 'u-1',
      sessionId: 'sess-1',
      partnerId: 'u-2',
      reason: 'SESSION_COMPLETED_XP',
      amount: 50,
      idempotencyKey: 'xp-idem-1',
      lagosDate: '2026-11-15',
      createdAt: new Date(),
    });

    // Attempt raw SQL UPDATE and DELETE on audit_log
    assert.throws(
      () => store.db.prepare(`UPDATE audit_log SET action = 'TAMPERED' WHERE id = 'audit-row-1'`).run(),
      /DB_APPEND_ONLY_VIOLATION: audit_log rows cannot be updated/
    );
    assert.throws(
      () => store.db.prepare(`DELETE FROM audit_log WHERE id = 'audit-row-1'`).run(),
      /DB_APPEND_ONLY_VIOLATION: audit_log rows cannot be deleted/
    );

    // Attempt raw SQL UPDATE and DELETE on xp_ledger
    assert.throws(
      () => store.db.prepare(`UPDATE xp_ledger SET amount = 999999 WHERE id = 'xp-row-1'`).run(),
      /DB_APPEND_ONLY_VIOLATION: xp_ledger rows cannot be updated/
    );
    assert.throws(
      () => store.db.prepare(`DELETE FROM xp_ledger WHERE id = 'xp-row-1'`).run(),
      /DB_APPEND_ONLY_VIOLATION: xp_ledger rows cannot be deleted/
    );

    // Verify original data is untouched
    const auditRow = store.db.prepare(`SELECT action FROM audit_log WHERE id = 'audit-row-1'`).get() as { action: string };
    assert.equal(auditRow.action, 'WARN_USER');
    const xpRow = store.db.prepare(`SELECT amount FROM xp_ledger WHERE id = 'xp-row-1'`).get() as { amount: number };
    assert.equal(xpRow.amount, 50);

    store.close();
  });
});
