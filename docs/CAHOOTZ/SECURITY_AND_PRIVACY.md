---
title: "Security, Privacy and Trust"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Security, Privacy and Trust

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 11.

## 11. Security, privacy and trust

_Authentication, authorization, data security, privacy, compliance and threat model_

> **Legal caution**  
> This chapter distinguishes legal requirements from recommended practices, but it is not legal advice. Items marked LEGAL REVIEW require a qualified Nigerian data-protection lawyer before launch. **[OPEN]**


### Authentication

| Topic | Recommendation **[PROPOSED]** |
|---|---|
| Password storage | Argon2id with per-user salt (or bcrypt cost as fallback); never log credentials; breached-password check |
| Registration and email | Verify email by one-time link or code; throttle; block disposable domains where appropriate |
| Phone OTP | Optional; account for SIM-swap risk; do not use SMS as the only high-assurance factor |
| Recovery | Time-limited single-use tokens; notify on change; step-up checks for risky recovery |
| MFA | Optional TOTP or passkeys for all; required for staff and admins |
| Sessions | Short-lived access token plus rotating refresh token in secure, HttpOnly, SameSite cookies; device list and revoke; absolute and idle timeouts |
| Brute force | Per-account and per-IP rate limits; progressive delays; alerting |


### Authorization

- Role-based access control for platform roles; **attribute and resource checks** for ownership, institution and group membership on every request (defence against IDOR/BOLA).
- Institution boundary: queries always include the institution scope; consider PostgreSQL row-level security as a second line of defence.
- Administrative separation: moderators, support and super admins have distinct permissions; no shared accounts; time-boxed elevation; all actions audited.
- Deny by default. Central policy layer, not scattered checks.


### Application security

| Risk | Mitigation **[PROPOSED]** |
|---|---|
| Injection (SQL) | Parameterized queries via ORM; no string-built SQL; least-privilege DB user |
| XSS | Context-aware output encoding; sanitize user rich text; strict Content-Security-Policy |
| CSRF | SameSite cookies plus CSRF tokens for cookie-authenticated mutations |
| SSRF | Allow-list outbound fetches (link previews, document import); block internal address ranges |
| IDOR / BOLA / broken access control | Object-level authorization tests for every endpoint; use unguessable ids |
| API abuse | Rate limits by user, IP and token; quotas; bot detection on signup; WAF |
| File uploads | Type allow-list, size caps, content sniffing, malware scan, store outside web root, serve via signed URL with safe headers |
| Dependency vulnerabilities | Lockfiles, automated dependency scanning, update cadence, SBOM |
| Security misconfiguration | Hardened infrastructure templates; secrets never in code; security headers |
| Logging and monitoring failures | Central logs, alerting on auth anomalies, tamper-resistant audit logs |

The control set is organized against the OWASP Top 10, the OWASP API Security Top 10 and the OWASP ASVS as the verification baseline. Target ASVS level for launch is Level 2 for the authentication, access control and file handling areas. **[PROPOSED]**


### Data security

| Topic | Recommendation **[PROPOSED]** |
|---|---|
| Encryption in transit | TLS 1.2+ everywhere, HSTS; internal service links encrypted |
| Encryption at rest | Managed disk and database encryption; object storage encryption; encrypted backups |
| Classification | Public, Internal, Personal, Sensitive Personal, Secret. Verification documents and moderation evidence are Sensitive. |
| Secrets management | Managed secrets store; rotation; no secrets in repos or client bundles |
| Database access | Private network only; no public endpoint; separate roles for app, migrations and read-only analytics |
| Backups and restoration | Automated daily plus point-in-time recovery; quarterly restore test; access-controlled |
| Retention and deletion | Defined per data class (table below); hard-delete jobs; deletion propagates to backups at expiry |
| Audit logging | Append-only record of privileged and sensitive actions with actor, target, time, reason |

| Data class | Retention **[PROPOSED]** |
|---|---|
| Account and profile | Life of account; delete or anonymize within a defined period after deletion request, subject to legal review |
| Verification documents | Delete shortly after decision; keep only the outcome and method |
| Messages | Life of account unless deleted by users; limited retention after account deletion |
| Moderation evidence | Minimum necessary period for appeals and legal obligations |
| Financial ledger | Retain as legally required; never edited, only reversed by new entries |
| AI conversations | Short default retention; user-deletable |
| Operational logs | Short rolling window; personal data minimized |


### Privacy

- **Data minimization.** Collect only what the feature needs. Avoid collecting phone numbers, real names and government IDs unless required.
- **Consent and transparency.** Clear privacy notice; granular consent for optional processing such as analytics and marketing; consent records stored.
- **Profile visibility.** Default to institution-only visibility; user-controlled per field.
- **Private messages.** Not read by staff by default. Access only through a documented report-based or legal process, and the privacy notice must say so. LEGAL REVIEW.
- **Video.** No recording by default **[CONFIRMED]**.
- **AI data handling.** Notices; provider contracts; no training on user content; deletion.
- **User rights.** Self-service export and deletion, correction, objection; response workflow with deadlines. LEGAL REVIEW.
- **Third parties.** Data processing agreements with every provider; track cross-border transfers.


### Compliance: Nigeria and international

| Item | What the research found | Classification |
|---|---|---|
| NDPA 2023 | Principal Nigerian data-protection law; GAID issued by NDPC 20 March 2025 provides implementation detail [[16]](references/REFERENCES.md#ref-16)[[17]](references/REFERENCES.md#ref-17) | Legal requirement |
| GAID effectiveness | Reported to have come into effect 19 September 2025 and to repeal the NDPR 2019 and its framework [[18]](references/REFERENCES.md#ref-18) | Legal requirement; verify with counsel |
| DCPMI registration | Controllers and processors of “major importance” must register with the NDPC; tiers (ultra-high, extra-high, ordinary-high) and annual compliance audit returns are described [[16]](references/REFERENCES.md#ref-16)[[17]](references/REFERENCES.md#ref-17) | Legal requirement if designated; determine tier. LEGAL REVIEW |
| DPO and DPIA | DCPMIs must designate a Data Protection Officer; GAID details when a Data Protection Impact Assessment is mandatory, with attention to children and high-risk processing [[17]](references/REFERENCES.md#ref-17)[[19]](references/REFERENCES.md#ref-19) | Legal requirement; likely relevant to a student platform with young users. LEGAL REVIEW |
| Children and minors | Under-18 students raise special consent and DPIA considerations; see Chapter 12 | LEGAL REVIEW |
| Other jurisdictions | GDPR (EU/UK) and similar laws apply if users in those regions are targeted. Not analyzed in this version. | OPEN |
| Cross-border transfers | AI and cloud providers outside Nigeria require a lawful transfer basis | LEGAL REVIEW |

Recommended practice, not stated law: appoint a privacy lead from day one, keep a record of processing activities, run a DPIA before launching the verification and AI features, and publish a plain-language privacy page. **[PROPOSED]**


### Threat model (STRIDE) **[PROPOSED]**

| Threat actor / vector | Asset | Impact | Likelihood | Mitigation | Residual |
|---|---|---|---|---|---|
| Spoofing: credential stuffing against accounts | Accounts | High | High | Rate limits, breached-password check, MFA option, alerts | Medium |
| Spoofing: fake student claiming a university | Academic graph | Medium | High | Verification tiers, manual review, reports | Medium |
| Tampering: client forges heartbeats or acks | Session integrity, XP | Medium | Medium | Server authority, caps, anomaly detection | Low-Medium |
| Tampering: user edits wallet balance via API | Ledger | High | Low | Server-only writes, append-only ledger, authorization tests | Low |
| Repudiation: moderator denies an action | Trust | Medium | Low | Immutable audit log with actor and reason | Low |
| Information disclosure: IDOR exposes private data | Profiles, messages | High | Medium | Object-level checks, RLS, tests | Low-Medium |
| Information disclosure: AI returns another student's notes | Private uploads | High | Low-Medium | Pre-filter by visibility, leak tests, no shared index for private | Low |
| Denial of service: connection floods on WebSocket gateway | Availability | Medium | Medium | CDN/WAF, per-IP limits, connection caps | Medium |
| Denial of wallet: AI abuse driving cost | Budget | High | Medium | Quotas, rate limits, per-user cost caps, alerts | Low-Medium |
| Elevation: malicious admin or compromised admin | All data | Very high | Low | MFA, separation of duties, time-boxed access, audit | Medium |
| Malicious file upload | Users, servers | High | Medium | Scan, sandbox, signed URLs, type allow-list | Low-Medium |
| Harassment and grooming via messaging or video | Students | Very high | Medium | Contact limits, blocking, reporting, moderation, age safeguards | Medium |

