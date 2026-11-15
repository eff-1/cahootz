import { DatabaseSync } from 'node:sqlite';

export interface SqlDatabaseSnapshot {
  version: string;
  exportedAt: string;
  tables: {
    users: Record<string, unknown>[];
    auth_sessions: Record<string, unknown>[];
    student_profiles: Record<string, unknown>[];
    student_enrolments: Record<string, unknown>[];
    study_invitations: Record<string, unknown>[];
    study_sessions: Record<string, unknown>[];
    session_events: Record<string, unknown>[];
    xp_ledger: Record<string, unknown>[];
    direct_messages: Record<string, unknown>[];
    audit_log: Record<string, unknown>[];
    consent_log: Record<string, unknown>[];
  };
}

/**
 * Relational SQL Persistence Store backed by Node 24's built-in `node:sqlite` (`DatabaseSync`).
 *
 * Provides:
 * 1. Disk-backed SQL tables that survive API process restarts (`dbPath`).
 * 2. Database-level `BEFORE UPDATE` and `BEFORE DELETE` triggers on `audit_log`,
 *    `xp_ledger`, and `session_events` enforcing append-only immutability at the SQL layer.
 * 3. Point-in-time SQL backup export and clean-database restore verification.
 */
export class CahootzSqlStore {
  public readonly db: DatabaseSync;
  public readonly dbPath: string;

  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        is_verified INTEGER NOT NULL DEFAULT 0,
        is_staff INTEGER NOT NULL DEFAULT 0,
        totp_secret TEXT,
        totp_enabled INTEGER NOT NULL DEFAULT 0,
        roles_json TEXT NOT NULL,
        profile_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL,
        device_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        is_revoked INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS student_profiles (
        user_id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        org_unit_id TEXT,
        programme_id TEXT,
        level_id TEXT,
        display_name TEXT NOT NULL,
        bio TEXT,
        study_goals_json TEXT NOT NULL,
        preferred_modes_json TEXT NOT NULL,
        availability_json TEXT NOT NULL,
        visibility TEXT NOT NULL,
        is_discoverable INTEGER NOT NULL DEFAULT 1,
        verification_status TEXT NOT NULL,
        institutional_email TEXT,
        onboarding_completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS student_enrolments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        term_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_invitations (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        goal TEXT NOT NULL,
        proposed_start_at TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        idempotency_key TEXT,
        responded_at TEXT,
        session_id TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        host_id TEXT NOT NULL,
        partner_id TEXT NOT NULL,
        goal TEXT NOT NULL,
        mode TEXT NOT NULL,
        planned_duration_minutes INTEGER NOT NULL,
        ping_response_window_seconds INTEGER NOT NULL,
        state TEXT NOT NULL,
        version INTEGER NOT NULL,
        scheduled_start_at TEXT NOT NULL,
        started_at TEXT,
        paused_at TEXT,
        paused_duration_seconds INTEGER NOT NULL DEFAULT 0,
        ended_at TEXT,
        idempotency_key TEXT,
        participants_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        actor_id TEXT,
        event_type TEXT NOT NULL,
        from_state TEXT,
        to_state TEXT,
        client_event_id TEXT,
        client_seq INTEGER,
        client_timestamp TEXT,
        server_timestamp TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE(session_id, seq)
      );

      CREATE TRIGGER IF NOT EXISTS trg_session_events_no_update
      BEFORE UPDATE ON session_events
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: session_events rows cannot be updated');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_session_events_no_delete
      BEFORE DELETE ON session_events
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: session_events rows cannot be deleted');
      END;

      CREATE TABLE IF NOT EXISTS xp_ledger (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT,
        partner_id TEXT,
        reason TEXT NOT NULL,
        amount INTEGER NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        lagos_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TRIGGER IF NOT EXISTS trg_xp_ledger_no_update
      BEFORE UPDATE ON xp_ledger
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: xp_ledger rows cannot be updated');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_xp_ledger_no_delete
      BEFORE DELETE ON xp_ledger
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: xp_ledger rows cannot be deleted');
      END;

      CREATE TABLE IF NOT EXISTS direct_messages (
        id TEXT PRIMARY KEY,
        conversation_key TEXT NOT NULL,
        seq INTEGER NOT NULL,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        body TEXT NOT NULL,
        client_message_id TEXT NOT NULL,
        is_removed_by_moderation INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(conversation_key, seq)
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        seq INTEGER NOT NULL UNIQUE,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_update
      BEFORE UPDATE ON audit_log
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: audit_log rows cannot be updated');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_delete
      BEFORE DELETE ON audit_log
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: audit_log rows cannot be deleted');
      END;

      CREATE TABLE IF NOT EXISTS consent_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        purpose TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        granted INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TRIGGER IF NOT EXISTS trg_consent_log_no_update
      BEFORE UPDATE ON consent_log
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: consent_log rows cannot be updated');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_consent_log_no_delete
      BEFORE DELETE ON consent_log
      BEGIN
        SELECT RAISE(ABORT, 'DB_APPEND_ONLY_VIOLATION: consent_log rows cannot be deleted');
      END;
    `);
  }

  // ─── Upsert & Append Helpers ─────────────────────────────────────

  saveUser(u: {
    id: string;
    email: string;
    passwordHash: string;
    dateOfBirth: Date;
    isVerified: boolean;
    isStaff: boolean;
    totpSecret: string | null;
    totpEnabled: boolean;
    roles: string[];
    profile: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, email, password_hash, date_of_birth, is_verified, is_staff,
        totp_secret, totp_enabled, roles_json, profile_json, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        password_hash = excluded.password_hash,
        is_verified = excluded.is_verified,
        is_staff = excluded.is_staff,
        totp_secret = excluded.totp_secret,
        totp_enabled = excluded.totp_enabled,
        roles_json = excluded.roles_json,
        profile_json = excluded.profile_json,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
    `);
    stmt.run(
      u.id,
      u.email,
      u.passwordHash,
      u.dateOfBirth.toISOString(),
      u.isVerified ? 1 : 0,
      u.isStaff ? 1 : 0,
      u.totpSecret,
      u.totpEnabled ? 1 : 0,
      JSON.stringify(u.roles),
      JSON.stringify(u.profile),
      u.createdAt.toISOString(),
      u.updatedAt.toISOString(),
      u.deletedAt ? u.deletedAt.toISOString() : null
    );
  }

  saveAuthSession(s: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    deviceName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    isRevoked: boolean;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO auth_sessions (
        id, user_id, refresh_token_hash, device_name, ip_address, user_agent,
        is_revoked, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        refresh_token_hash = excluded.refresh_token_hash,
        is_revoked = excluded.is_revoked,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      s.id,
      s.userId,
      s.refreshTokenHash,
      s.deviceName,
      s.ipAddress,
      s.userAgent,
      s.isRevoked ? 1 : 0,
      s.expiresAt.toISOString(),
      s.createdAt.toISOString(),
      s.updatedAt.toISOString()
    );
  }

  saveStudentProfile(p: {
    userId: string;
    institutionId: string;
    orgUnitId: string | null;
    programmeId: string | null;
    levelId: string | null;
    displayName: string;
    bio: string | null;
    studyGoals: string[];
    preferredModes: string[];
    availabilityJson: Record<string, string[]>;
    visibility: string;
    isDiscoverable: boolean;
    verificationStatus: string;
    institutionalEmail: string | null;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO student_profiles (
        user_id, institution_id, org_unit_id, programme_id, level_id,
        display_name, bio, study_goals_json, preferred_modes_json,
        availability_json, visibility, is_discoverable, verification_status,
        institutional_email, onboarding_completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        institution_id = excluded.institution_id,
        org_unit_id = excluded.org_unit_id,
        programme_id = excluded.programme_id,
        level_id = excluded.level_id,
        display_name = excluded.display_name,
        bio = excluded.bio,
        study_goals_json = excluded.study_goals_json,
        preferred_modes_json = excluded.preferred_modes_json,
        availability_json = excluded.availability_json,
        visibility = excluded.visibility,
        is_discoverable = excluded.is_discoverable,
        verification_status = excluded.verification_status,
        institutional_email = excluded.institutional_email,
        onboarding_completed_at = excluded.onboarding_completed_at,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      p.userId,
      p.institutionId,
      p.orgUnitId,
      p.programmeId,
      p.levelId,
      p.displayName,
      p.bio,
      JSON.stringify(p.studyGoals),
      JSON.stringify(p.preferredModes),
      JSON.stringify(p.availabilityJson),
      p.visibility,
      p.isDiscoverable ? 1 : 0,
      p.verificationStatus,
      p.institutionalEmail,
      p.onboardingCompletedAt ? p.onboardingCompletedAt.toISOString() : null,
      p.createdAt.toISOString(),
      p.updatedAt.toISOString()
    );
  }

  saveEnrolment(e: {
    id: string;
    userId: string;
    courseId: string;
    termId: string;
    createdAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO student_enrolments (id, user_id, course_id, term_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(e.id, e.userId, e.courseId, e.termId, e.createdAt.toISOString());
  }

  saveInvitation(inv: {
    id: string;
    institutionId: string;
    senderId: string;
    recipientId: string;
    courseId: string;
    goal: string;
    proposedStartAt: Date;
    durationMinutes: number;
    mode: string;
    status: string;
    idempotencyKey: string | null;
    respondedAt: Date | null;
    sessionId: string | null;
    createdAt: Date;
    expiresAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO study_invitations (
        id, institution_id, sender_id, recipient_id, course_id, goal,
        proposed_start_at, duration_minutes, mode, status, idempotency_key,
        responded_at, session_id, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        responded_at = excluded.responded_at,
        session_id = excluded.session_id
    `);
    stmt.run(
      inv.id,
      inv.institutionId,
      inv.senderId,
      inv.recipientId,
      inv.courseId,
      inv.goal,
      inv.proposedStartAt.toISOString(),
      inv.durationMinutes,
      inv.mode,
      inv.status,
      inv.idempotencyKey,
      inv.respondedAt ? inv.respondedAt.toISOString() : null,
      inv.sessionId,
      inv.createdAt.toISOString(),
      inv.expiresAt.toISOString()
    );
  }

  saveStudySession(s: {
    id: string;
    institutionId: string;
    courseId: string;
    hostId: string;
    partnerId: string;
    goal: string;
    mode: string;
    plannedDurationMinutes: number;
    pingResponseWindowSeconds: number;
    state: string;
    version: number;
    scheduledStartAt: Date;
    startedAt: Date | null;
    pausedAt: Date | null;
    pausedDurationSeconds: number;
    endedAt: Date | null;
    idempotencyKey: string | null;
    participants: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO study_sessions (
        id, institution_id, course_id, host_id, partner_id, goal, mode,
        planned_duration_minutes, ping_response_window_seconds, state, version,
        scheduled_start_at, started_at, paused_at, paused_duration_seconds,
        ended_at, idempotency_key, participants_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        version = excluded.version,
        started_at = excluded.started_at,
        paused_at = excluded.paused_at,
        paused_duration_seconds = excluded.paused_duration_seconds,
        ended_at = excluded.ended_at,
        participants_json = excluded.participants_json,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      s.id,
      s.institutionId,
      s.courseId,
      s.hostId,
      s.partnerId,
      s.goal,
      s.mode,
      s.plannedDurationMinutes,
      s.pingResponseWindowSeconds,
      s.state,
      s.version,
      s.scheduledStartAt.toISOString(),
      s.startedAt ? s.startedAt.toISOString() : null,
      s.pausedAt ? s.pausedAt.toISOString() : null,
      s.pausedDurationSeconds,
      s.endedAt ? s.endedAt.toISOString() : null,
      s.idempotencyKey,
      JSON.stringify(s.participants),
      s.createdAt.toISOString(),
      s.updatedAt.toISOString()
    );
  }

  appendSessionEvent(ev: {
    id: string;
    sessionId: string;
    seq: number;
    actorId: string | null;
    eventType: string;
    fromState: string | null;
    toState: string | null;
    clientEventId: string | null;
    clientSeq: number | null;
    clientTimestamp: Date | null;
    serverTimestamp: Date;
    payload: Record<string, unknown>;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO session_events (
        id, session_id, seq, actor_id, event_type, from_state, to_state,
        client_event_id, client_seq, client_timestamp, server_timestamp, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      ev.id,
      ev.sessionId,
      ev.seq,
      ev.actorId,
      ev.eventType,
      ev.fromState,
      ev.toState,
      ev.clientEventId,
      ev.clientSeq,
      ev.clientTimestamp ? ev.clientTimestamp.toISOString() : null,
      ev.serverTimestamp.toISOString(),
      JSON.stringify(ev.payload)
    );
  }

  appendXpLedger(entry: {
    id: string;
    userId: string;
    sessionId: string | null;
    partnerId: string | null;
    reason: string;
    amount: number;
    idempotencyKey: string;
    lagosDate: string;
    createdAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO xp_ledger (
        id, user_id, session_id, partner_id, reason, amount, idempotency_key, lagos_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id,
      entry.userId,
      entry.sessionId,
      entry.partnerId,
      entry.reason,
      entry.amount,
      entry.idempotencyKey,
      entry.lagosDate,
      entry.createdAt.toISOString()
    );
  }

  saveDirectMessage(msg: {
    id: string;
    conversationKey: string;
    seq: number;
    senderId: string;
    recipientId: string;
    body: string;
    clientMessageId: string;
    isRemovedByModeration: boolean;
    createdAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO direct_messages (
        id, conversation_key, seq, sender_id, recipient_id, body,
        client_message_id, is_removed_by_moderation, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.id,
      msg.conversationKey,
      msg.seq,
      msg.senderId,
      msg.recipientId,
      msg.body,
      msg.clientMessageId,
      msg.isRemovedByModeration ? 1 : 0,
      msg.createdAt.toISOString()
    );
  }

  appendAuditLog(entry: {
    id: string;
    seq: number;
    actorId: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO audit_log (
        id, seq, actor_id, actor_role, action, target_type, target_id, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id,
      entry.seq,
      entry.actorId,
      entry.actorRole,
      entry.action,
      entry.targetType,
      entry.targetId,
      JSON.stringify(entry.metadata),
      entry.createdAt.toISOString()
    );
  }

  appendConsentLog(entry: {
    id: string;
    userId: string;
    purpose: string;
    policyVersion: string;
    granted: boolean;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO consent_log (
        id, user_id, purpose, policy_version, granted, ip_address, user_agent, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id,
      entry.userId,
      entry.purpose,
      entry.policyVersion,
      entry.granted ? 1 : 0,
      entry.ipAddress,
      entry.userAgent,
      entry.timestamp.toISOString()
    );
  }

  // ─── Full SQL Snapshot Export & Restore into Clean Database ──────

  exportSnapshot(now: Date = new Date()): SqlDatabaseSnapshot {
    const queryAll = (table: string) =>
      this.db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];

    return {
      version: '1.0',
      exportedAt: now.toISOString(),
      tables: {
        users: queryAll('users'),
        auth_sessions: queryAll('auth_sessions'),
        student_profiles: queryAll('student_profiles'),
        student_enrolments: queryAll('student_enrolments'),
        study_invitations: queryAll('study_invitations'),
        study_sessions: queryAll('study_sessions'),
        session_events: queryAll('session_events'),
        xp_ledger: queryAll('xp_ledger'),
        direct_messages: queryAll('direct_messages'),
        audit_log: queryAll('audit_log'),
        consent_log: queryAll('consent_log'),
      },
    };
  }

  restoreSnapshotIntoCleanDb(snapshot: SqlDatabaseSnapshot): void {
    const insertRows = (table: string, rows: Record<string, unknown>[]) => {
      if (rows.length === 0) return;
      const cols = Object.keys(rows[0]!);
      const placeholders = cols.map(() => '?').join(', ');
      const stmt = this.db.prepare(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
      );
      for (const row of rows) {
        stmt.run(...cols.map((c) => row[c] as any));
      }
    };

    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const [table, rows] of Object.entries(snapshot.tables)) {
        insertRows(table, rows);
      }
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }
}

