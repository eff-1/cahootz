# Cahootz — Engineering Runbook, Kill-Switches & Incident Response

> **STATUS: PILOT OPERATIONS RUNBOOK (`SCALABILITY_AND_INFRASTRUCTURE.md` Chapter 19)**

---

## 1. Feature Flags & Emergency Kill-Switches (`AdministrationService`)
If a subsystem experiences abuse or instability during the pilot, MFA-verified administrators can toggle kill-switches immediately without redeploying:
- `STUDY_TOGETHER_ENABLED`: Controls new session creation (active sessions complete gracefully).
- `DISCOVERY_ENABLED`: Controls partner discovery queries and "Study Now" broadcasts.
- `MESSAGING_ENABLED`: Pauses 1:1 direct messaging platform-wide.
- `COMMUNITIES_ENABLED`: Pauses new Q&A posts and answers.
- `COURSE_PROPOSALS_ENABLED`: Pauses student course proposals if spam occurs.

---

## 2. Database Backup & Point-in-Time Restore Drill (`SnapshotBackupService`)
- **Automated Daily Snapshot**: Exported with an HMAC-SHA256 integrity signature (`createSignedBackup`).
- **Restore Verification Procedure**:
  1. Run `verifyAndRestore(bundle)` against an isolated staging/recovery instance.
  2. Confirm HMAC-SHA256 signature matches and row counts (`institutionCount`, `studentProfileCount`, `completedSessionCount`, `xpLedgerCount`, `auditLogCount`) reconcile 100%.
  3. Target Pilot Recovery Objectives (`OPEN-10` defaults): **RPO <= 24 hours** (daily signed snapshot + WAL), **RTO <= 4 hours**.

---

## 3. Security & Data Breach Incident Response (NDPA 2023 Alignment)
> *Note: Legal notification timelines require counsel verification (`NEEDS COUNSEL REVIEW`).*
1. **Contain**:
   - If refresh token replay is detected, `IdentityService.refresh()` automatically revokes **all** sessions for the affected user.
   - If a staff account is suspected of compromise, revoke sessions and rotate `JWT_SECRET` / `CSRF_SECRET`.
2. **Assess**:
   - Query the append-only `AuditLog` (`ModerationService.listAuditLog`) and request correlation logs (`X-Request-Id`) to determine scope.
3. **Notify**:
   - Escalate immediately to the Founder (Faruq) and appointed Nigerian Data Protection Counsel to assess NDPA 2023 / NDPC notification obligations (72-hour regulator window where applicable).

