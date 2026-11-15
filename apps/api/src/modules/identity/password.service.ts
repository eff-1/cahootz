import * as crypto from 'node:crypto';

/**
 * Password Hashing Service using Node 24 built-in `crypto.argon2('argon2id', ...)`
 * (RFC 9106 / OWASP recommended Argon2id parameters: m=19456 KiB, t=2 passes, p=1, tag=32 bytes).
 * Produces standard PHC string format: `$argon2id$v=19$m=19456,t=2,p=1$<salt_b64>$<tag_b64>`
 */
export class PasswordService {
  private readonly memoryKiB = 19456; // 19 MiB (OWASP minimum recommended for Argon2id)
  private readonly passes = 2;
  private readonly parallelism = 1;
  private readonly tagLength = 32;

  async hash(password: string): Promise<string> {
    const nonce = crypto.randomBytes(16);
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.argon2(
        'argon2id',
        {
          message: password,
          nonce,
          parallelism: this.parallelism,
          tagLength: this.tagLength,
          memory: this.memoryKiB,
          passes: this.passes,
        },
        (err, key) => {
          if (err) return reject(err);
          resolve(key);
        }
      );
    });

    const saltB64 = nonce.toString('base64url');
    const tagB64 = derivedKey.toString('base64url');
    return `$argon2id$v=19$m=${this.memoryKiB},t=${this.passes},p=${this.parallelism}$${saltB64}$${tagB64}`;
  }

  async verify(phcHash: string, attempt: string): Promise<boolean> {
    if (!phcHash.startsWith('$argon2id$')) {
      return false;
    }
    const parts = phcHash.split('$');
    // ['', 'argon2id', 'v=19', 'm=19456,t=2,p=1', '<salt>', '<tag>']
    if (parts.length !== 6) return false;

    const paramsStr = parts[3]!;
    const saltB64 = parts[4]!;
    const expectedTagB64 = parts[5]!;

    const mMatch = paramsStr.match(/m=(\d+)/);
    const tMatch = paramsStr.match(/t=(\d+)/);
    const pMatch = paramsStr.match(/p=(\d+)/);
    if (!mMatch || !tMatch || !pMatch) return false;

    const memory = Number(mMatch[1]);
    const passes = Number(tMatch[1]);
    const parallelism = Number(pMatch[1]);
    const nonce = Buffer.from(saltB64, 'base64url');
    const expectedTag = Buffer.from(expectedTagB64, 'base64url');

    return new Promise<boolean>((resolve) => {
      crypto.argon2(
        'argon2id',
        {
          message: attempt,
          nonce,
          parallelism,
          tagLength: expectedTag.length,
          memory,
          passes,
        },
        (err, derivedKey) => {
          if (err || derivedKey.length !== expectedTag.length) {
            return resolve(false);
          }
          resolve(crypto.timingSafeEqual(expectedTag, derivedKey));
        }
      );
    });
  }
}
