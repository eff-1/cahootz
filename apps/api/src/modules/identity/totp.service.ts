import * as crypto from 'crypto';

export class TotpService {
  /**
   * Generates a random Base32-compatible secret (160-bit).
   */
  generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = crypto.randomBytes(20);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
      secret += chars[bytes[i] % chars.length];
    }
    return secret;
  }

  /**
   * Generates otpauth URI for QR codes.
   */
  keyuri(account: string, issuer: string, secret: string): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Decodes Base32 string to Buffer.
   */
  private base32Decode(base32: string): Buffer {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < base32.length; i++) {
      const idx = chars.indexOf(base32.charAt(i).toUpperCase());
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(output);
  }

  /**
   * Computes TOTP code for a secret at a given counter/time.
   */
  generateToken(secret: string, timeStep = Math.floor(Date.now() / 1000 / 30)): string {
    const secretBuffer = this.base32Decode(secret);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeStep));

    const hmac = crypto.createHmac('sha1', secretBuffer).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Verifies a 6-digit TOTP token within a ±1 time step window.
   */
  verify(token: string, secret: string): boolean {
    if (!token || token.length !== 6) return false;
    const currentStep = Math.floor(Date.now() / 1000 / 30);

    for (let delta = -1; delta <= 1; delta++) {
      const expected = this.generateToken(secret, currentStep + delta);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
        return true;
      }
    }
    return false;
  }
}
