import * as crypto from 'crypto';

export class PasswordService {
  private argon2Module: any = null;

  constructor() {
    try {
      this.argon2Module = require('argon2');
    } catch {
      // Native argon2 not present in runtime; scrypt fallback enabled
    }
  }

  async hash(password: string): Promise<string> {
    if (this.argon2Module) {
      return this.argon2Module.hash(password, {
        type: this.argon2Module.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    }

    const salt = crypto.randomBytes(32).toString('hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`$scrypt$${salt}$${derivedKey.toString('hex')}`);
      });
    });
  }

  async verify(hash: string, attempt: string): Promise<boolean> {
    if (hash.startsWith('$scrypt$')) {
      const parts = hash.split('$');
      const salt = parts[2];
      const key = parts[3];
      if (!salt || !key) return false;

      return new Promise((resolve) => {
        crypto.scrypt(attempt, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
          if (err) return resolve(false);
          const keyBuffer = Buffer.from(key, 'hex');
          resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        });
      });
    }

    if (this.argon2Module) {
      return this.argon2Module.verify(hash, attempt);
    }

    return false;
  }
}
