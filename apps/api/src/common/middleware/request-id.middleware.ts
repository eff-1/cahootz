import * as crypto from 'crypto';

export class RequestIdMiddleware {
  use(req: any, res: any, next: () => void) {
    const existingId = req.headers?.['x-request-id'];
    const requestId = existingId || crypto.randomUUID();

    req.requestId = requestId;
    if (res.setHeader) {
      res.setHeader('X-Request-Id', requestId);
    }

    next();
  }
}
