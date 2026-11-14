import { AppError } from '../errors/app-error.ts';

interface CachedResponse {
  status: number;
  body: any;
  inFlight: boolean;
  timestamp: number;
}

export class IdempotencyMiddleware {
  private readonly cache = new Map<string, CachedResponse>();

  use(req: any, res: any, next: () => void) {
    if (req.method !== 'POST' && req.method !== 'PATCH') {
      return next();
    }

    const idempotencyKey = req.headers?.['idempotency-key'];
    if (!idempotencyKey) {
      return next();
    }

    const userId = req.user?.sub || req.ip || 'anon';
    const key = `${userId}:${req.method}:${req.path}:${idempotencyKey}`;
    const now = Date.now();

    const existing = this.cache.get(key);
    if (existing) {
      if (existing.inFlight) {
        throw AppError.idempotencyConflict('A request with this idempotency key is currently being processed');
      }

      if (res.setHeader) {
        res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
      }
      return res.status(existing.status).json(existing.body);
    }

    this.cache.set(key, {
      status: 200,
      body: null,
      inFlight: true,
      timestamp: now,
    });

    const originalJson = res.json?.bind(res);
    if (originalJson) {
      res.json = (body: any) => {
        this.cache.set(key, {
          status: res.statusCode || 200,
          body,
          inFlight: false,
          timestamp: Date.now(),
        });
        return originalJson(body);
      };
    }

    next();
  }
}
