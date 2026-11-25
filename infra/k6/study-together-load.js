import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Cahootz — Realistic Study Together k6 Load Scenario (Requirement E)
 * - 100 simulated concurrent students over 5 minutes against a persisted SQLite DB (`CAHOOTZ_DB_PATH`).
 * - Exercises: Register -> Login -> Onboarding -> Session creation -> Check-in ->
 *   Heartbeats every 15s -> Accountability Pings & Responses.
 */
export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<250', 'p(99)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || __ENV.API_URL || 'http://127.0.0.1:4100';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function () {
  const vuId = __VU;
  const iter = __ITER;
  const emailA = `k6.host.${vuId}.${iter}@live.unilag.edu.ng`;
  const emailB = `k6.partner.${vuId}.${iter}@live.unilag.edu.ng`;
  const ipHeaderA = { ...JSON_HEADERS, 'X-Forwarded-For': `10.100.${Math.floor(vuId / 250)}.${vuId % 250}` };
  const ipHeaderB = { ...JSON_HEADERS, 'X-Forwarded-For': `10.101.${Math.floor(vuId / 250)}.${vuId % 250}` };

  // 1. Register & Login Host (A) and Partner (B)
  const regA = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({ email: emailA, password: 'StrongPassword123!', dateOfBirth: '2002-05-10' }),
    { headers: ipHeaderA }
  );
  check(regA, { 'regA 201': (r) => r.status === 201 });

  const regB = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({ email: emailB, password: 'StrongPassword123!', dateOfBirth: '2002-07-15' }),
    { headers: ipHeaderB }
  );
  check(regB, { 'regB 201': (r) => r.status === 201 });
  const userBId = regB && regB.status === 201 ? regB.json('data.userId') : null;

  const loginA = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: emailA, password: 'StrongPassword123!' }),
    { headers: ipHeaderA }
  );
  const loginB = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: emailB, password: 'StrongPassword123!' }),
    { headers: ipHeaderB }
  );
  check(loginA, { 'loginA 200': (r) => r.status === 200 });
  check(loginB, { 'loginB 200': (r) => r.status === 200 });

  const tokenA = loginA && loginA.status === 200 ? loginA.json('data.accessToken') : null;
  const tokenB = loginB && loginB.status === 200 ? loginB.json('data.accessToken') : null;

  if (!userBId || !tokenA || !tokenB) {
    return;
  }

  const authA = { ...JSON_HEADERS, Authorization: `Bearer ${tokenA}` };
  const authB = { ...JSON_HEADERS, Authorization: `Bearer ${tokenB}` };

  // 2. Complete Onboarding for both students
  const obA = http.post(
    `${BASE_URL}/api/v1/students/onboarding`,
    JSON.stringify({
      institutionId: 'inst-pilot-sample-uni',
      displayName: `K6 Host ${vuId}`,
      courseIds: ['course-pilot-csc-301'],
    }),
    { headers: authA }
  );
  const obB = http.post(
    `${BASE_URL}/api/v1/students/onboarding`,
    JSON.stringify({
      institutionId: 'inst-pilot-sample-uni',
      displayName: `K6 Partner ${vuId}`,
      courseIds: ['course-pilot-csc-301'],
    }),
    { headers: authB }
  );
  check(obA, { 'obA 200': (r) => r.status === 200 });
  check(obB, { 'obB 200': (r) => r.status === 200 });

  // 3. Create Study Together Session & Check In
  const sessRes = http.post(
    `${BASE_URL}/api/v1/sessions`,
    JSON.stringify({
      partnerId: userBId,
      courseId: 'course-pilot-csc-301',
      goal: 'k6 realistic load session',
      plannedDurationMinutes: 25,
      idempotencyKey: `k6-sess-${vuId}-${iter}`,
    }),
    { headers: authA }
  );
  check(sessRes, { 'create session 201': (r) => r.status === 201 });
  const sessionId = sessRes && sessRes.status === 201 ? sessRes.json('data.id') : null;
  if (!sessionId) {
    return;
  }

  const ciA = http.post(`${BASE_URL}/api/v1/sessions/${sessionId}/check-in`, '{}', { headers: authA });
  const ciB = http.post(`${BASE_URL}/api/v1/sessions/${sessionId}/check-in`, '{}', { headers: authB });
  check(ciA, { 'check-in A 200': (r) => r.status === 200 });
  check(ciB, { 'check-in B 200': (r) => r.status === 200 });

  // 4. Send Heartbeats every 15s + Accountability Ping & Response
  for (let seq = 1; seq <= 2; seq++) {
    sleep(15);
    const hbA = http.post(
      `${BASE_URL}/api/v1/sessions/${sessionId}/heartbeat`,
      JSON.stringify({
        clientEventId: `k6-hb-a-${vuId}-${iter}-${seq}`,
        clientSeq: seq,
        visibility: 'VISIBLE',
      }),
      { headers: authA }
    );
    const hbB = http.post(
      `${BASE_URL}/api/v1/sessions/${sessionId}/heartbeat`,
      JSON.stringify({
        clientEventId: `k6-hb-b-${vuId}-${iter}-${seq}`,
        clientSeq: seq,
        visibility: 'VISIBLE',
      }),
      { headers: authB }
    );
    check(hbA, { 'heartbeat A 200': (r) => r.status === 200 });
    check(hbB, { 'heartbeat B 200': (r) => r.status === 200 });
  }

  const pingRes = http.post(
    `${BASE_URL}/api/v1/sessions/${sessionId}/ping`,
    JSON.stringify({ idempotencyKey: `k6-ping-${vuId}-${iter}` }),
    { headers: authA }
  );
  check(pingRes, { 'ping sent 201': (r) => r.status === 201 });
  const pingId = pingRes.json('data.id');

  if (pingId) {
    const ansRes = http.post(
      `${BASE_URL}/api/v1/sessions/${sessionId}/ping/${pingId}/respond`,
      '{}',
      { headers: authB }
    );
    check(ansRes, { 'ping answered 200': (r) => r.status === 200 });
  }
}
