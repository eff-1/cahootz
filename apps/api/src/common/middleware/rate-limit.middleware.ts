import { AppError } from '../errors/app-error.ts';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimitMiddleware {
  private readonly store = new Map<string, RateLimitRecord>();

  use(req: any, res: any, next: () => void) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const path = req.baseUrl || req.path || '/';
    const key = `${ip}:${path}`;
    const now = Date.now();

    const isAuth = path.includes('/auth/');
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = isAuth ? 10 : 100;

    const record = this.store.get(key);

    if (!record || record.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      if (res.setHeader) {
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      }
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      if (res.setHeader) {
        res.setHeader('Retry-After', retryAfterSec);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
      }
      throw AppError.rateLimited('Rate limit exceeded. Please wait before retrying.');
    }

    record.count++;
    if (res.setHeader) {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
    }
    next();
  }
}
