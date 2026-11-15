/**
 * k6 Load Test — Cahootz Study Together & Partner Discovery SLO Verification
 *
 * Targets (SCALABILITY_AND_INFRASTRUCTURE.md Chapter 17):
 * - HTTP API p95 latency < 250ms under concurrent campus evening peak load
 * - Error rate < 0.5%
 *
 * Usage:
 *   k6 run infra/k6/study-together-load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 concurrent students
    { duration: '1m', target: 100 },  // Peak campus evening study hour
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.005'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:4000';

export default function () {
  const healthRes = http.get(`${BASE_URL}/healthz`);
  check(healthRes, {
    'healthz status is 200': (r) => r.status === 200,
    'has X-Request-Id header': (r) => Boolean(r.headers['X-Request-Id']),
  });

  const instRes = http.get(`${BASE_URL}/api/v1/institutions`);
  check(instRes, {
    'institutions list is 200': (r) => r.status === 200,
  });

  sleep(1);
}

