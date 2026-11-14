import test from 'node:test';
import assert from 'node:assert';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware.ts';
import { RateLimitMiddleware } from '../src/common/middleware/rate-limit.middleware.ts';
import { IdempotencyMiddleware } from '../src/common/middleware/idempotency.middleware.ts';

test('RequestIdMiddleware', async (t) => {
  const middleware = new RequestIdMiddleware();

  await t.test('Generates new UUID when X-Request-Id is missing', () => {
    const req: any = { headers: {} };
    const res: any = {
      headers: {},
      setHeader(name: string, val: string) {
        this.headers[name] = val;
      },
    };
    let nextCalled = false;

    middleware.use(req, res, () => {
      nextCalled = true;
    });

    assert.ok(nextCalled);
    assert.ok(req.requestId);
    assert.strictEqual(res.headers['X-Request-Id'], req.requestId);
  });

  await t.test('Preserves client-supplied X-Request-Id', () => {
    const customId = 'client-req-9999';
    const req: any = { headers: { 'x-request-id': customId } };
    const res: any = {
      headers: {},
      setHeader(name: string, val: string) {
        this.headers[name] = val;
      },
    };

    middleware.use(req, res, () => {});

    assert.strictEqual(req.requestId, customId);
    assert.strictEqual(res.headers['X-Request-Id'], customId);
  });
});

test('RateLimitMiddleware', async (t) => {
  const middleware = new RateLimitMiddleware();

  await t.test('Allows requests under limit and sets rate limit headers', () => {
    const req: any = { ip: '192.168.1.1', path: '/api/v1/auth/login' };
    const res: any = {
      headers: {},
      setHeader(name: string, val: any) {
        this.headers[name] = val;
      },
    };

    middleware.use(req, res, () => {});

    assert.strictEqual(res.headers['X-RateLimit-Limit'], 10);
    assert.strictEqual(res.headers['X-RateLimit-Remaining'], 9);
    assert.ok(res.headers['X-RateLimit-Reset']);
  });

  await t.test('Enforces rate limit when threshold is exceeded', () => {
    const ip = '10.0.0.5';
    const path = '/api/v1/auth/register';

    // Exhaust limit (10 requests)
    for (let i = 0; i < 10; i++) {
      const req: any = { ip, path };
      const res: any = { headers: {}, setHeader() {} };
      middleware.use(req, res, () => {});
    }

    // 11th request must throw 429
    const req: any = { ip, path };
    const res: any = {
      headers: {},
      setHeader(name: string, val: any) {
        this.headers[name] = val;
      },
    };

    assert.throws(
      () => {
        middleware.use(req, res, () => {});
      },
      (err: any) => {
        assert.strictEqual(err.code, 'RATE_LIMITED');
        assert.strictEqual(res.headers['X-RateLimit-Remaining'], 0);
        assert.ok(res.headers['Retry-After']);
        return true;
      },
    );
  });
});

test('IdempotencyMiddleware', async (t) => {
  const middleware = new IdempotencyMiddleware();

  await t.test('Ignores GET requests', () => {
    const req: any = { method: 'GET', path: '/api/v1/study-sessions', headers: { 'idempotency-key': 'key-1' } };
    const res: any = {};
    let nextCalled = false;

    middleware.use(req, res, () => {
      nextCalled = true;
    });

    assert.ok(nextCalled);
  });

  await t.test('Caches and returns original response for repeated POST with same idempotency key', () => {
    const idempotencyKey = 'unique-session-creation-key-123';
    const req1: any = {
      method: 'POST',
      path: '/api/v1/study-sessions',
      headers: { 'idempotency-key': idempotencyKey },
      user: { sub: 'user-abc' },
    };

    let cachedStatus = 0;
    let cachedJsonBody: any = null;
    const res1: any = {
      statusCode: 201,
      headers: {},
      setHeader(k: string, v: string) {
        this.headers[k] = v;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: any) {
        cachedStatus = this.statusCode;
        cachedJsonBody = body;
        return body;
      },
    };

    middleware.use(req1, res1, () => {
      // simulate handler finishing with 201 Created
      res1.json({ sessionId: 'session-777', status: 'CREATED' });
    });

    assert.strictEqual(cachedStatus, 201);
    assert.strictEqual(cachedJsonBody.sessionId, 'session-777');

    // Second request with SAME idempotency key
    const req2: any = {
      method: 'POST',
      path: '/api/v1/study-sessions',
      headers: { 'idempotency-key': idempotencyKey },
      user: { sub: 'user-abc' },
    };

    let secondStatus = 0;
    let secondJsonBody: any = null;
    let secondNextCalled = false;

    const res2: any = {
      headers: {},
      setHeader(k: string, v: string) {
        this.headers[k] = v;
      },
      status(code: number) {
        secondStatus = code;
        return this;
      },
      json(body: any) {
        secondJsonBody = body;
        return body;
      },
    };

    middleware.use(req2, res2, () => {
      secondNextCalled = true;
    });

    // Handler should NOT be called; cached response returned directly
    assert.strictEqual(secondNextCalled, false);
    assert.strictEqual(res2.headers['X-Cache-Lookup'], 'HIT-IDEMPOTENT');
    assert.strictEqual(secondStatus, 201);
    assert.deepStrictEqual(secondJsonBody, { sessionId: 'session-777', status: 'CREATED' });
  });
});

