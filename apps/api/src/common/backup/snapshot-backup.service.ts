import { createHmac } from 'node:crypto';
import { AppError } from '../errors/app-error.ts';

export interface BackupSnapshotPayload {
  version: string;
  createdAt: string;
  institutionCount: number;
  studentProfileCount: number;
  completedSessionCount: number;
  xpLedgerCount: number;
  auditLogCount: number;
  data: {
    institutions: unknown[];
    studentProfiles: unknown[];
    completedSessions: unknown[];
    xpLedger: unknown[];
    auditLog: unknown[];
  };
}

export interface SignedBackupBundle {
  payload: BackupSnapshotPayload;
  hmacSha256: string;
}

/**
 * Backup & Restore Drill Service (M6 / T-021).
 * Produces an integrity-signed snapshot of critical state and verifies point-in-time restoration.
 */
export class SnapshotBackupService {
  private readonly integrityKey: string;

  constructor(integrityKey = 'cahootz-backup-integrity-hmac-key!') {
    this.integrityKey = integrityKey;
  }

  createSignedBackup(
    data: BackupSnapshotPayload['data'],
    now: Date = new Date()
  ): SignedBackupBundle {
    const payload: BackupSnapshotPayload = {
      version: '1.0',
      createdAt: now.toISOString(),
      institutionCount: data.institutions.length,
      studentProfileCount: data.studentProfiles.length,
      completedSessionCount: data.completedSessions.length,
      xpLedgerCount: data.xpLedger.length,
      auditLogCount: data.auditLog.length,
      data: JSON.parse(JSON.stringify(data)),
    };

    const canonical = JSON.stringify(payload);
    const hmacSha256 = createHmac('sha256', this.integrityKey)
      .update(canonical)
      .digest('hex');

    return { payload, hmacSha256 };
  }

  verifyAndRestore(bundle: SignedBackupBundle): {
    restored: boolean;
    verifiedCounts: {
      institutionCount: number;
      studentProfileCount: number;
      completedSessionCount: number;
      xpLedgerCount: number;
      auditLogCount: number;
    };
  } {
    const canonical = JSON.stringify(bundle.payload);
    const expectedHmac = createHmac('sha256', this.integrityKey)
      .update(canonical)
      .digest('hex');

    if (expectedHmac !== bundle.hmacSha256) {
      throw AppError.validationFailed(
        'Backup integrity check failed: HMAC-SHA256 signature mismatch.'
      );
    }

    const { data, institutionCount, studentProfileCount, completedSessionCount, xpLedgerCount, auditLogCount } =
      bundle.payload;

    if (
      data.institutions.length !== institutionCount ||
      data.studentProfiles.length !== studentProfileCount ||
      data.completedSessions.length !== completedSessionCount ||
      data.xpLedger.length !== xpLedgerCount ||
      data.auditLog.length !== auditLogCount
    ) {
      throw AppError.validationFailed('Backup row count verification failed.');
    }

    return {
      restored: true,
      verifiedCounts: {
        institutionCount,
        studentProfileCount,
        completedSessionCount,
        xpLedgerCount,
        auditLogCount,
      },
    };
  }
}

