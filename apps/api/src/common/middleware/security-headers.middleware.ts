import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../errors/app-error.ts';

export const SECURITY_HEADERS: Record<string, string> = Object.freeze({
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});

export class SecurityHeadersAndCsrfMiddleware {
  private readonly csrfSecret: string;

  constructor(csrfSecret = 'cahootz-csrf-hmac-secret-key-32ch!') {
    this.csrfSecret = csrfSecret;
  }

  applyHeaders(resHeaders: Record<string, string>): void {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      resHeaders[k] = v;
    }
  }

  generateCsrfToken(sessionId: string): string {
    const nonce = randomBytes(16).toString('hex');
    const mac = createHmac('sha256', this.csrfSecret)
      .update(`${sessionId}:${nonce}`)
      .digest('hex');
    return `${nonce}.${mac}`;
  }

  verifyCsrfForMutatingRequest(req: {
    method: string;
    sessionId: string;
    csrfCookie?: string;
    csrfHeader?: string;
  }): boolean {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    if (!req.csrfCookie || !req.csrfHeader || req.csrfCookie !== req.csrfHeader) {
      throw AppError.forbidden('CSRF token missing or mismatched.');
    }

    const parts = req.csrfHeader.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw AppError.forbidden('Malformed CSRF token.');
    }

    const expectedMac = createHmac('sha256', this.csrfSecret)
      .update(`${req.sessionId}:${parts[0]}`)
      .digest('hex');

    const actualBuf = Buffer.from(parts[1], 'utf8');
    const expectedBuf = Buffer.from(expectedMac, 'utf8');
    if (
      actualBuf.length !== expectedBuf.length ||
      !timingSafeEqual(actualBuf, expectedBuf)
    ) {
      throw AppError.forbidden('Invalid CSRF token signature.');
    }

    return true;
  }
}
