import crypto from 'node:crypto';
import fs from 'node:fs';
import { CahootzSqlStore } from '../../prisma/sql-store.ts';
import { AppError } from '../errors/app-error.ts';

export interface S3StorageAdapter {
  putObject(key: string, body: Buffer, contentType: string): Promise<{ etag: string; key: string }>;
  getObject(key: string): Promise<Buffer>;
  listObjects?(prefix?: string): Promise<string[]>;
}

/**
 * In-memory / test storage adapter simulating remote S3 / Cloudflare R2 bucket.
 */
export class InMemoryS3Adapter implements S3StorageAdapter {
  private readonly objects = new Map<string, Buffer>();

  async putObject(key: string, body: Buffer, contentType = 'application/octet-stream'): Promise<{ etag: string; key: string }> {
    this.objects.set(key, Buffer.from(body));
    const etag = crypto.createHash('md5').update(body).digest('hex');
    return { etag, key };
  }

  async getObject(key: string): Promise<Buffer> {
    const buf = this.objects.get(key);
    if (!buf) {
      throw AppError.notFound(`S3 object not found: ${key}`);
    }
    return Buffer.from(buf);
  }

  async listObjects(prefix = ''): Promise<string[]> {
    return Array.from(this.objects.keys()).filter((k) => k.startsWith(prefix));
  }
}

/**
 * Native SigV4 S3 Storage Adapter supporting AWS S3, Cloudflare R2, MinIO, and Backblaze B2.
 */
export class AwsS3CompatibleAdapter implements S3StorageAdapter {
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: {
    endpoint: string;
    bucket: string;
    region?: string;
    accessKeyId: string;
    secretAccessKey: string;
    fetchFn?: typeof fetch;
  }) {
    this.endpoint = options.endpoint.replace(/\/$/, '');
    this.bucket = options.bucket;
    this.region = options.region || 'auto';
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.fetchFn = options.fetchFn || fetch;
  }

  private sign(
    method: string,
    uri: string,
    headers: Record<string, string>,
    payloadHash: string,
    date: Date
  ): Record<string, string> {
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const service = 's3';

    const signedHeadersList = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort();
    const signedHeaders = signedHeadersList.join(';');

    const canonicalHeaders = signedHeadersList
      .map((k) => `${k}:${headers[k] ?? headers[k.toUpperCase()] ?? ''}\n`)
      .join('');

    const canonicalRequest = [
      method,
      uri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...headers,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authorization,
    };
  }

  async putObject(key: string, body: Buffer, contentType = 'application/octet-stream'): Promise<{ etag: string; key: string }> {
    const uri = `/${this.bucket}/${key.replace(/^\//, '')}`;
    const url = `${this.endpoint}${uri}`;
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    const now = new Date();

    const host = new URL(this.endpoint).host;
    const baseHeaders: Record<string, string> = {
      host,
      'content-type': contentType,
      'content-length': String(body.length),
    };

    const signedHeaders = this.sign('PUT', uri, baseHeaders, payloadHash, now);

    const res = await this.fetchFn(url, {
      method: 'PUT',
      headers: signedHeaders,
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw AppError.internal(`S3 PUT failed with HTTP ${res.status}: ${errText}`);
    }

    const etag = res.headers.get('etag') || payloadHash;
    return { etag, key };
  }

  async getObject(key: string): Promise<Buffer> {
    const uri = `/${this.bucket}/${key.replace(/^\//, '')}`;
    const url = `${this.endpoint}${uri}`;
    const payloadHash = crypto.createHash('sha256').update('').digest('hex');
    const now = new Date();

    const host = new URL(this.endpoint).host;
    const baseHeaders: Record<string, string> = {
      host,
    };

    const signedHeaders = this.sign('GET', uri, baseHeaders, payloadHash, now);

    const res = await this.fetchFn(url, {
      method: 'GET',
      headers: signedHeaders,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw AppError.internal(`S3 GET failed with HTTP ${res.status}: ${errText}`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}

export interface EncryptedBackupBundle {
  version: '2.0-enc';
  algorithm: 'aes-256-gcm';
  iv: string; // hex
  authTag: string; // hex
  ciphertext: string; // base64
  createdAt: string;
  sha256Plaintext: string;
  tableCounts: Record<string, number>;
}

/**
 * Off-site Encrypted Backup Service.
 * Encrypts SQLite database files using AES-256-GCM and ships to off-site S3-compatible storage.
 * Performs integrity-verified restoration into a clean SQLite database.
 */
export class S3EncryptedBackupService {
  private readonly storage: S3StorageAdapter;
  private readonly encryptionKey: Buffer;

  constructor(options: {
    storage?: S3StorageAdapter;
    encryptionKey?: string | Buffer;
  } = {}) {
    this.storage = options.storage || new InMemoryS3Adapter();

    const rawKey =
      options.encryptionKey ||
      process.env.BACKUP_ENCRYPTION_KEY ||
      'cahootz-aes256-backup-secret-key-must-be-32-bytes!';

    if (Buffer.isBuffer(rawKey)) {
      this.encryptionKey = rawKey;
    } else {
      // Derive uniform 32-byte key via SHA-256
      this.encryptionKey = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  encrypt(buffer: Buffer): { iv: string; authTag: string; ciphertext: string } {
    const iv = crypto.randomBytes(12); // standard 96-bit IV for AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: encrypted.toString('base64'),
    };
  }

  decrypt(ivHex: string, authTagHex: string, ciphertextBase64: string): Buffer {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  }

  /**
   * Backs up an active or stopped SQLite DB file:
   * 1. Inspects table row counts via read-only store.
   * 2. Reads raw SQLite database buffer.
   * 3. Encrypts with AES-256-GCM.
   * 4. Uploads encrypted JSON bundle to S3 off-site bucket.
   */
  async createAndUploadBackup(
    sqlitePath: string,
    customKey?: string
  ): Promise<{ backupKey: string; sha256: string; tableCounts: Record<string, number> }> {
    if (!fs.existsSync(sqlitePath)) {
      throw AppError.notFound(`Database file not found: ${sqlitePath}`);
    }

    const sqlStore = new CahootzSqlStore(sqlitePath);
    const tableCounts = sqlStore.getTableRowCounts();
    sqlStore.close();

    const dbBytes = fs.readFileSync(sqlitePath);
    const sha256Plaintext = crypto.createHash('sha256').update(dbBytes).digest('hex');

    const { iv, authTag, ciphertext } = this.encrypt(dbBytes);

    const bundle: EncryptedBackupBundle = {
      version: '2.0-enc',
      algorithm: 'aes-256-gcm',
      iv,
      authTag,
      ciphertext,
      createdAt: new Date().toISOString(),
      sha256Plaintext,
      tableCounts,
    };

    const backupKey = customKey || `backups/${new Date().toISOString().replace(/[:.]/g, '-')}-cahootz.enc.json`;
    const payloadBuf = Buffer.from(JSON.stringify(bundle, null, 2), 'utf8');

    await this.storage.putObject(backupKey, payloadBuf, 'application/json');

    return {
      backupKey,
      sha256: sha256Plaintext,
      tableCounts,
    };
  }

  /**
   * Downloads an encrypted backup bundle from S3, verifies AES-256-GCM auth tag,
   * checks SHA-256 digest, and restores the SQLite database into a clean file.
   */
  async downloadAndRestore(
    backupKey: string,
    targetDbPath: string
  ): Promise<{ restored: boolean; sha256: string; tableCounts: Record<string, number> }> {
    const rawBundleBuf = await this.storage.getObject(backupKey);
    const bundle: EncryptedBackupBundle = JSON.parse(rawBundleBuf.toString('utf8'));

    if (bundle.version !== '2.0-enc' || bundle.algorithm !== 'aes-256-gcm') {
      throw AppError.validationFailed('Unsupported backup format or cipher algorithm.');
    }

    // Decrypt and verify authentication tag
    let decryptedBytes: Buffer;
    try {
      decryptedBytes = this.decrypt(bundle.iv, bundle.authTag, bundle.ciphertext);
    } catch {
      throw AppError.validationFailed('Backup decryption or AEAD auth tag verification failed. Data may be corrupted or tampered with.');
    }

    const sha256Decrypted = crypto.createHash('sha256').update(decryptedBytes).digest('hex');
    if (sha256Decrypted !== bundle.sha256Plaintext) {
      throw AppError.validationFailed('Decrypted database SHA-256 hash mismatch.');
    }

    // Ensure target directory exists
    const dir = targetDbPath.substring(0, targetDbPath.lastIndexOf(targetDbPath.includes('/') ? '/' : '\\'));
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write restored database to disk
    fs.writeFileSync(targetDbPath, decryptedBytes);

    // Verify restored database tables and row counts
    const restoredStore = new CahootzSqlStore(targetDbPath);
    const restoredCounts = restoredStore.getTableRowCounts();
    restoredStore.close();

    for (const [table, expectedCount] of Object.entries(bundle.tableCounts)) {
      if ((restoredCounts[table] ?? 0) !== expectedCount) {
        throw AppError.validationFailed(
          `Restored table count mismatch for "${table}": expected ${expectedCount}, got ${restoredCounts[table]}`
        );
      }
    }

    return {
      restored: true,
      sha256: sha256Decrypted,
      tableCounts: restoredCounts,
    };
  }
}
