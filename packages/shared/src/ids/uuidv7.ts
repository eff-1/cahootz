/**
 * UUIDv7 generator (RFC 9562, section 5.7).
 *
 * Layout: 48-bit Unix epoch milliseconds | 4-bit version (7) | 12 bits random |
 *         2-bit variant (10) | 62 bits random.
 *
 * Time-ordered ids give index locality in PostgreSQL B-trees while staying
 * unguessable enough for object ids (74 random bits). Authorization never relies
 * on id secrecy; every endpoint still checks object-level access.
 *
 * Uses the global Web Crypto API (available in Node >= 19 and all modern browsers).
 */
export function uuidv7(nowMs: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);

  // 48-bit big-endian timestamp in bytes 0..5
  let ts = Math.floor(nowMs);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ts & 0xff;
    ts = Math.floor(ts / 256);
  }

  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Extracts the millisecond timestamp embedded in a UUIDv7. */
export function uuidv7Timestamp(id: string): number {
  const hex = id.replace(/-/g, '').slice(0, 12);
  return parseInt(hex, 16);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Alias for UUIDv7 primary key generation across domain services. */
export const createId = uuidv7;


