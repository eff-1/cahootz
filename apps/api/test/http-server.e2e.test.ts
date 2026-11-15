import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCahootzHttpServer,
  type CahootzApplicationContext,
} from '../src/server.ts';

describe('HTTP E2E Server Integration — Full API Request/Response Pipeline', () => {
  let ctx: CahootzApplicationContext;

  beforeEach(() => {
    ctx = createCahootzHttpServer();
  });

  it('1. serves /healthz with strict CSP, X-Frame-Options, Permissions-Policy, and X-Request-Id headers', async () => {
    const res = await ctx.dispatch({
      method: 'GET',
      url: '/healthz',
      headers: { 'X-Request-Id': 'req-e2e-health-001' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers['X-Request-Id'], 'req-e2e-health-001');
    assert.equal(res.headers['X-Frame-Options'], 'DENY');
    assert.ok(res.headers['Content-Security-Policy']?.includes("frame-ancestors 'none'"));
    assert.ok(res.headers['Permissions-Policy']?.includes('camera=()'));

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.pilotInstitutionId, ctx.pilotSeed.institutionId);
  });

  it('2. executes full HTTP student journey: register -> login -> list institutions -> onboard -> discover -> create session -> check in -> export NDPA data', async () => {
    // 1. Register Student 1 & Student 2
    const r1 = await ctx.dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: {
        email: 'http.s1@gmail.com',
        password: 'StrongPassword123!',
        dateOfBirth: '2003-04-10',
      },
    });
    assert.equal(r1.status, 201);

    const r2 = await ctx.dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: {
        email: 'http.s2@gmail.com',
        password: 'StrongPassword123!',
        dateOfBirth: '2003-08-15',
      },
    });
    assert.equal(r2.status, 201);

    // 2. Login Student 1 & Student 2
    const login1Res = await ctx.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: {
        email: 'http.s1@gmail.com',
        password: 'StrongPassword123!',
      },
    });
    assert.equal(login1Res.status, 200);
    const login1 = login1Res.body.data;
    const token1 = login1.accessToken as string;

    const login2Res = await ctx.dispatch({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: {
        email: 'http.s2@gmail.com',
        password: 'StrongPassword123!',
      },
    });
    const login2 = login2Res.body.data;
    const token2 = login2.accessToken as string;

    // 3. Fetch Pilot Institution Structure
    const structRes = await ctx.dispatch({
      method: 'GET',
      url: `/api/v1/institutions/${ctx.pilotSeed.institutionId}/structure`,
    });
    assert.equal(structRes.status, 200);
    const structData = structRes.body.data;
    const csc301Id = structData.courses.find((c: any) => c.code === 'CSC 301').id;

    // 4. Complete Onboarding for both students over HTTP
    const ob1 = await ctx.dispatch({
      method: 'POST',
      url: '/api/v1/students/onboarding',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        institutionId: ctx.pilotSeed.institutionId,
        displayName: 'HTTP Student One',
        courseIds: [csc301Id],
        studyGoals: ['Exam Prep'],
      },
    });
    assert.equal(ob1.status, 200);

    const ob2 = await ctx.dispatch({
      method: 'POST',
      url: '/api/v1/students/onboarding',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        institutionId: ctx.pilotSeed.institutionId,
        displayName: 'HTTP Student Two',
        courseIds: [csc301Id],
        studyGoals: ['Exam Prep'],
      },
    });
    assert.equal(ob2.status, 200);

    // 5. Discover Partners over HTTP
    const discRes = await ctx.dispatch({
      method: 'GET',
      url: '/api/v1/discovery/partners',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.equal(discRes.status, 200);
    assert.equal(discRes.body.data.items.length, 1);
    assert.equal(discRes.body.data.items[0].userId, login2.user.id);

    // 6. Create Study Session & Check In Both Participants over HTTP
    const createSessRes = await ctx.dispatch({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: {
        Authorization: `Bearer ${token1}`,
        'Idempotency-Key': 'e2e-http-sess-001',
      },
      body: {
        partnerId: login2.user.id,
        courseId: csc301Id,
        goal: 'HTTP E2E Study Session',
        plannedDurationMinutes: 30,
      },
    });
    assert.equal(createSessRes.status, 201);
    const session = createSessRes.body.data;

    await ctx.dispatch({
      method: 'POST',
      url: `/api/v1/sessions/${session.id}/check-in`,
      headers: { Authorization: `Bearer ${token1}` },
      body: { clientEventId: 'ci-1' },
    });
    const ci2Res = await ctx.dispatch({
      method: 'POST',
      url: `/api/v1/sessions/${session.id}/check-in`,
      headers: { Authorization: `Bearer ${token2}` },
      body: { clientEventId: 'ci-2' },
    });
    assert.equal(ci2Res.body.data.state, 'ACTIVE');

    // 7. Export NDPA Data Portability JSON over HTTP
    const exportRes = await ctx.dispatch({
      method: 'GET',
      url: '/api/v1/privacy/export',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.equal(exportRes.status, 200);
    assert.equal(exportRes.body.data.academicProfile.displayName, 'HTTP Student One');
  });
});
