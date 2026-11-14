# Cahootz — Plain-Language Privacy Notice & Processor Register (DRAFT)

> **STATUS: DRAFT — NEEDS COUNSEL REVIEW (`OPEN-06`, `OPEN-07`)**
> This document is an engineering and product draft aligned with the Nigeria Data Protection Act (NDPA) 2023 and the 2025 General Application and Implementation Directive (GAID). It does **not** constitute legal advice and must be reviewed and approved by qualified Nigerian data-protection counsel before public launch.

---

## 1. Who We Are & Purpose of Processing
**Cahootz** (working name; configurable via `BRAND_NAME`) is an academic study-commitment platform for university students in Nigeria. We process personal data strictly to:
1. Authenticate your account and protect account security.
2. Match you with study partners at your university who share your courses, academic level, and study goals.
3. Run the **Study Together** focus timer, presence heartbeats, streaks, and XP ledger fairly.
4. Keep the community safe from harassment, spam, and academic misconduct.

---

## 2. Personal Data We Collect (Data Minimisation — Rule 8)
| Category | Fields Collected | Lawful Basis (NDPA 2023 — *Needs Counsel Review*) |
|---|---|---|
| **Account Identity** | Email address, Argon2id password hash, Date of Birth (for age-band verification) | Contract performance & Legal obligation (minor protection) |
| **Academic Profile** | Institution, Faculty/College/Department (`OrgUnit`), Programme, Level, Enrolled Courses, Study Goals, Availability | Contract performance & Consent |
| **Institutional Verification (Optional)** | Institutional email address (`.edu.ng`) verified via 6-digit OTP | Consent (Core studying is never blocked if unverified) |
| **Study Together Telemetry** | Session check-ins, heartbeat timestamps, pause/resume intervals, accountability ping responses | Contract performance (fair completion & dispute resolution) |
| **Safety & Moderation** | User blocks, safety reports, restricted evidence snapshots, append-only staff audit logs | Legitimate interest / Legal obligation (user safety) |

**What We Never Collect**:
- We **never** access your camera, microphone, or screen during MVP Study Together sessions.
- We **never** sell personal data or run behavioral advertising.

---

## 3. Under-18 Student Protection (`OPEN-06` — *Needs Counsel Review*)
- Registration is disallowed for individuals under **16 years old**.
- Students aged **16–17** are placed in **Restricted Mode** by default:
  - Profile visibility cannot be set to `PUBLIC` (restricted to `INSTITUTION` or `PRIVATE`).
  - Default discoverability is disabled until explicitly configured.
  - Direct messages (DMs) from or to non-session contacts are strictly blocked.

---

## 4. Data Retention Schedule (`RETENTION_CONFIG` — *Needs Counsel Review*)
- **Account Deletion Grace Period**: 30 days from deletion request before irreversible anonymization/purge.
- **Session Telemetry (`session_events`)**: 365 days.
- **Moderation Evidence Snapshots**: 180 days after case closure.

---

## 5. Your Rights Under NDPA 2023
You can exercise the following rights directly in-app or by contacting our Data Protection contact:
1. **Right of Access & Data Portability**: Use the self-service **Export My Data (JSON)** endpoint (`/api/v1/privacy/export`).
2. **Right to Erasure (Account Deletion)**: Request account deletion (`/api/v1/privacy/delete-account`), which immediately revokes all active sessions and schedules permanent purge after the 30-day grace window.
3. **Right to Withdraw Consent & Hide Profile**: Toggle `isDiscoverable: false` or `visibility: PRIVATE` at any time.

---

## 6. Sub-Processors / Data Processor List (`infra/` & Production Targets)
*Needs Counsel Review for Cross-Border Transfer Assessment under NDPA 2023 Part VI:*
| Processor | Role / Purpose | Data Hosted | Environment |
|---|---|---|---|
| **PostgreSQL Host** | Primary relational database | Account, profile, session, and ledger records | Local Docker (Dev) / Managed Cloud (Prod) |
| **Redis Host** | Ephemeral presence TTL keys, rate limits, queues | Session presence & rate-limit counters | Local Docker (Dev) / Managed Cloud (Prod) |
| **Cloudflare R2 (S3-compatible)** | Object storage (disabled in MVP until virus scanning is active) | Static assets / future verified uploads | Stubbed in MVP |
| **Transactional Email Provider** | Verification OTPs & password reset emails | Recipient email address & OTP | Mailpit (Dev) / Transactional SMTP (Prod) |
