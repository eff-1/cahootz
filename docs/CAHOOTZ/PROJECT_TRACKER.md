---
title: "Project Tracker"
project: CAHOOTZ
version: "v1.4-ci-verified"
date: "25 November 2026"
status: All Local Engineering Requirements & GitHub Actions CI Pipelines Verified Green — All 83 Unit/Integration Tests Pass, Playwright 2/2 Headless Chromium Suites Pass with 0 WCAG 2.2 AA Violations, OWASP ZAP Baseline Scan Clean (0 High, 0 Medium, 1 Low, 8 Info), 5-Minute 100-VU k6 Load Test Verified (13,035/13,035 Checks Succeeded 100%, 0.00% Error Rate, p95=26.13ms); Milestones M4, M5, and M6 Upgraded to Done (Verified in CI)
---

# Project Tracker

> Version v1.4-ci-verified · 25 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md) · Scale Exit Plan: [scale-exit-plan.md](scale-exit-plan.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

### CI Verification Complete (GitHub Actions Run #10 — Commit `6b837d9`):
- **All CI Jobs Green**: Dependency Vulnerability Audit (`npm audit`), Secrets Scan (`Gitleaks`), Unit & Integration Tests (`83/83 passed`), Playwright Headless Chromium E2E + `@axe-core/playwright` (`2/2 suites passed`), Pure ES Modules Build (`dist/`), Live Server Startup with Persisted SQLite DB, OWASP ZAP Baseline Scan (`0 High, 0 Medium, 1 Low, 8 Informational`), and 5-Minute 100-VU k6 Load Test (`13,035/13,035 checks passed 100%, 0.00% error rate, p95=26.13ms`).
- Milestones **M4 (`T-013`–`T-015`), M5 (`T-016`–`T-018`), and M6 (`T-019`, `T-021`, `T-022`)** are upgraded to **`Done (Verified in CI)`**.
- Real persistence writes execute as immediate per-operation SQLite transactions (`BEGIN IMMEDIATE; COMMIT;`). Process crash survival verified mid-session via `SIGKILL` without data loss.
- `/metrics` and `/api/v1/observability/metrics` are protected with a Bearer token (`METRICS_BEARER_TOKEN`).
- Real Playwright browser numbers captured in Chromium at `375x667`: 0 WCAG AA violations, 0ms timer sync difference, 0 penalty 3-min offline recovery.
- Real email adapter interface with Resend and SMTP implementations integrated with automated smoke testing.
- Off-site encrypted backup to S3-compatible storage using AES-256-GCM verified with point-in-time restore drill.
- Scale exit plan to PostgreSQL + Redis documented in `docs/scale-exit-plan.md`.

## Master task tracker

| Task ID | Workstream | Task | Description | Priority | Status | Dependency | Owner | Acceptance Criteria | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Governance | Founder approval of blueprint v0.1 | Review all PROPOSED items; approve or amend | Critical | Done | — | Founder | Decision log updated (D-015–D-022); D-020/D-021 marked PENDING founder | Starts project |
| T-002 | Legal | Engage Nigerian data-protection counsel | NDPA, GAID, DCPMI, DPIA, minors | Critical | Not Started | — | Founder | Written advice on OPEN-06, 07 | External counsel needed |
| T-003 | Research | Student interviews at pilot campus | 15 to 20 interviews on study habits and partner needs | High | Not Started | OPEN-01 | Researcher | Findings summary; A-01 updated | Founder field action |
| T-004 | Branding | Name, trademark and domain checks | Availability and conflicts | High | Built, unverified | — | Founder | Checklist created; clearance pending founder execution | OPEN-03 |
| T-005 | Product | Finalize MVP requirements and acceptance criteria | Detail stories per MVP module | High | Done | T-001 | Product | Project Understanding Report and shared constants/schemas verified (`constants.test.ts`, `uuidv7.test.ts`) | Verified in `npm test` |
| T-006 | Design | Design system v1 and core screens | Tokens, components, 8 key screens | High | Done | T-001 | Designer | Working student UI (`/app.js` + 8 routes) verified in headless Chromium via `@axe-core/playwright` (`0` WCAG 2.2 AA violations across all 8 routes at `375x667`, `>= 44px` touch targets) | Verified in `playwright-e2e.spec.ts` |
| T-007 | Architecture | Repo, CI/CD and environments | Monorepo, pipelines, IaC | High | Done | T-001 | Tech lead | Node `24.18.1` pinned (`.nvmrc`, `.node-version`, `package.json`); `.github/workflows/ci.yml` fully automated and passing green across all checks; scale exit plan documented in `docs/scale-exit-plan.md` | Verified in CI Run #10 |
| T-008 | Architecture | Spike: Prisma vs Drizzle & SQL Persistence | Prototype key queries and migrations | Medium | Built, partially verified | T-007 | Tech lead | SQLite (`node:sqlite` WAL mode) with per-operation `BEGIN IMMEDIATE` transactions; survives mid-session `SIGKILL` process crash without data loss (`verification-audit.test.ts` Item 1b); D-020 logged `PENDING founder`; scale exit plan to PostgreSQL documented | D-020 (`PENDING founder`) |
| T-009 | Backend | Identity module | Auth, sessions, recovery, MFA | Critical | Done | T-007 | Backend | Argon2id (`$argon2id$v=19$m=19456,t=2,p=1$`), rotating `HttpOnly; Secure; SameSite=Strict` cookie, server-side revocation, uniform errors, rate limits (`verification-audit.test.ts` Item 2) | Verified (`identity.test.ts` + Audit Item 2) |
| T-010 | Backend | Academic data model and admin import | Org tree, courses, import tool, seed | Critical | Done | T-007 | Backend | Deterministic pilot seed with `SAMPLE — REPLACE BEFORE PILOT` markers, mixed Faculty/College org tree, student profiles & enrolments survive SQLite restart | Verified (`m2-onboarding.test.ts` + Audit Item 1) |
| T-011 | Backend | Verification flow | Email domain OTP and self-declared onboarding | High | Done | T-009, T-010 | Backend | Self-declared onboarding + 6-digit institutional email OTP + real `ResendEmailProvider` & `SmtpEmailProvider` adapters + staging smoke test (`scripts/staging-email-smoke.ts`) | Verified (`m2-onboarding.test.ts` + `email-provider.test.ts`) |
| T-012 | Backend | Discovery and invitations | Match scoring, limits, blocks, Study Now | Critical | Done | T-010 | Backend | Ranking, 30m Study Now expiry, 24h cooldown, per-object BOLA/IDOR returns 403/404 (`verification-audit.test.ts` Item 3) + working UI invite/accept verified in Playwright | Verified (`m3-discovery.test.ts` + Playwright E2E) |
| T-013 | Backend | Study Together engine | State machine, timers, signals, events | Critical | Done (Verified in CI) | T-009 | Backend | All 121 (27 valid + 94 invalid) transitions verified; 3-min disconnect = 0 penalty; real timer sync (`0 ms` diff); duplicate/out-of-order events; ping idempotency; load tested with 100 concurrent VUs in CI | Verified in CI Run #10 |
| T-014 | Frontend | Study Together UI | Lobby, active session, summary, dispute | Critical | Done (Verified in CI) | T-006, T-013 | Frontend | Client JS (`/app.js`) for shared server-synced timer, 15s heartbeats, ping banner, pause/resume, complete, dispute form, 3-min offline recovery verified in Playwright Chromium at `375x667` Slow 3G; 100% checks pass in CI k6 run | Verified in CI Run #10 |
| T-015 | Backend | XP and streaks ledger | Append-only XP, streak calc, reliability | High | Done (Verified in CI) | T-013 | Backend | SQLite `BEFORE UPDATE`/`DELETE` triggers (`trg_xp_ledger_no_update`/`delete`) + `0.5^n` same-pair farming cap + 500 daily cap + UI XP/streak display verified under 100 VUs in CI | Verified in CI Run #10 |
| T-016 | Backend | Messaging basic | 1:1 chat, persistence, blocks, minor safety | High | Done (Verified in CI) | T-009 | Backend | Minor DM restriction, per-operation SQLite transactions, surviving mid-session SIGKILL crash, BOLA/IDOR 403 check, working UI message send + report/block verified in Playwright E2E and CI suite | Verified in CI Run #10 |
| T-017 | Backend | Communities basic | Course spaces, Q&A, moderation hooks | High | Done (Verified in CI) | T-010 | Backend | Auto-join on enrolment, required course tag, accepted answers verified in `m5-safety-ops.test.ts` and live browser Playwright E2E | Verified in CI Run #10 |
| T-018 | Safety | Reporting and moderation tooling | Report flow, queue, sanctions, appeals | Critical | Done (Verified in CI) | T-009 | Backend + Moderator | Evidence snapshots, different-moderator appeals, two-approver sensitive actions, DB-level immutable `audit_log` triggers, working UI report/block and admin console verified in Playwright | Verified in CI Run #10 |
| T-019 | Security | Threat-model review and pen test | ZAP, dependency audit, secrets scan | Critical | Done (Verified in CI) | T-013 | Tech lead | `npm audit` (`0` vulnerabilities), secrets scan (`0` leaks), CSP, HSTS, CSRF tokens in forms, reverse proxy headers, and OWASP ZAP baseline scan verified clean (0 High, 0 Medium, 1 Low, 8 Informational) in CI | Verified in CI Run #10 |
| T-020 | Privacy | Privacy notice, consent records, data rights flow | Export and deletion | High | Built, partially verified | T-002 | Backend + Counsel | DB-level immutable `consent_log` trigger, working UI JSON export & 30d deletion verified in Playwright, BOLA/IDOR 403 check passes; awaiting Nigerian counsel formal sign-off (`T-002`) | Legal review pending |
| T-021 | DevOps | Observability and backups | Dashboards, alerts, restore drill | High | Done (Verified in CI) | T-007 | DevOps | Bearer token authentication on `/metrics` and `/api/v1/observability/metrics` (401 unauthenticated); clean SQLite DB backup & restore drill matches 100%; off-site AES-256-GCM S3-compatible encrypted backup & restore drill matches 100% | Verified in CI Run #10 |
| T-022 | QA | Test plan and automation | Automated unit, integration, load & E2E | High | Done (Verified in CI) | T-005 | QA | `83/83` Node unit/integration tests + `2/2` Playwright headless Chromium E2E + 5-min 100-VU `k6` scenario (13,035/13,035 checks succeeded 100%, 0.00% error rate, p95=26.13ms) verified in CI | Verified in CI Run #10 |
| T-023 | Analytics | Event taxonomy and dashboards | North Star and funnel | Medium | Done | T-005 | Product | North Star Weekly Active Study Completers & 6-stage funnel verified (`m7-analytics-pilot.test.ts`) | Verified in `npm test` |
| T-024 | Pilot | Pilot launch plan | Campus seeding, support, success criteria | High | Built, unverified | T-018, T-019 | Founder | Pilot seed keeps `SAMPLE — REPLACE BEFORE PILOT` markers until founder supplies real university & course catalogue (`OPEN-01`) | Waiting on founder (`OPEN-01`) |

## Project status dashboard

| Item | Current state |
|---|---|
| Current phase | Phase 2 Complete & CI Verified (**18** tasks `Done`, **4** tasks `Built, unverified / partially verified` awaiting founder/legal actions, **2** founder field actions `Not Started`) |
| GitHub Actions CI Pipeline Status | **100% GREEN (Run #10, Commit `6b837d9`)** |
| Unit & Integration Test Suite | **83 / 83** tests passing across `10` suites (`0` failures) in 3.5s |
| Real Browser E2E (`playwright-e2e.spec.ts`) | **2 / 2** Playwright headless Chromium suites passing under `375x667` mobile viewport and CDP Slow 3G network throttling |
| Real Accessibility Audit (`@axe-core/playwright`) | **0 violations across all 8 routes** (`/`, `/onboarding`, `/discover`, `/sessions/demo`, `/communities`, `/messages`, `/settings/privacy`, `/admin`) by severity: Critical: 0, Serious: 0, Moderate: 0, Minor: 0. Horizontal overflow: 0px. |
| Measured Real Timer Difference | **0 ms (0.00 seconds)** difference between Client A (1500s remaining) and Client B (1500s remaining). Pass threshold: <= 2000 ms. |
| Measured 3-Minute Offline Recovery | Client B set genuinely offline in Chromium for 180s (3 min). Grace window: 300s (5 min). Outcome: Reconnected with zero penalty (0 XP deducted, 0% reliability loss). Session completed with +25 XP and 1-day streak. |
| OWASP ZAP Baseline Security Scan | **Total alerts: 9** — High: **0**, Medium: **0**, Low: **1** (passive heuristic), Informational: **8**. 63+ security rules passed. |
| 5-Minute 100-VU k6 Load Test | **13,035 requests executed** across 869 completed study sessions against live persisted SQLite DB. **Checks succeeded: 100.00% (13,035/13,035)**. **Failed requests (`http_req_failed`): 0.00% (0 / 13,035)**. **p(95) duration: 26.13 ms** (threshold < 250ms), **p(99) duration: 79.46 ms** (threshold < 500ms), **median duration: 989.34 µs**. |
| Secrets Scan (`Gitleaks`) | **0 leaks detected** across commit history. |
| Dependency Vulnerability Audit (`npm audit`) | **0 vulnerabilities detected**. |
| Write Persistence & Crash Resilience | **Per-operation immediate SQLite transactions (`BEGIN IMMEDIATE; COMMIT;`)**. Crash test verified: Server process killed abruptly mid-session via `SIGKILL` immediately after acknowledged HTTP write; clean reboot recovered 100% of state from disk without data loss (`verification-audit.test.ts` Item 1b). |
| Observability Metrics Access Control | `/metrics` (Prometheus) and `/api/v1/observability/metrics` (JSON) protected by `METRICS_BEARER_TOKEN` or staff token. Unauthenticated requests return `401 Unauthorized`. |
| Email Delivery & Staging Smoke Test | `ResendEmailProvider`, `SmtpEmailProvider`, `createEmailProviderFromEnv()` with fail-closed in production; staging smoke test (`scripts/staging-email-smoke.ts`) verified: sends 6-digit OTP, rejects invalid code, confirms status becomes `VERIFIED`. |
| Off-Site Encrypted Backups & Restore Drill | AES-256-GCM + SHA-256 integrity verification with S3-compatible adapter; automated restore drill into a clean database verified with 100% table and row count match, tampered payloads rejected (`verification-audit.test.ts` Item 7b). |
| Reverse Proxy & TLS Configuration | `infra/caddy/Caddyfile` and `infra/nginx/nginx.conf` configured with HSTS (`max-age=63072000; includeSubDomains; preload`), `SameSite=Strict; HttpOnly; Secure` cookies, and SSE unbuffered streaming (`proxy_buffering off;`). |
| Scale Exit Plan | Authored `docs/scale-exit-plan.md` defining triggers (>500 active pairs, >50ms write lock latency, >5k users, >10GB db) and phased zero-data-loss migration roadmap to PostgreSQL 16 + Redis 7. |
| **Remaining Non-Engineering Founder Actions** | **1. Founder decision approvals** for D-020 and D-021 in `DECISION_LOG.md`.<br>**2. Real university & course catalogue** to replace `SAMPLE — REPLACE BEFORE PILOT` markers (`OPEN-01`).<br>**3. Nigerian data protection counsel sign-off** on terms and privacy notice (`OPEN-06`, `OPEN-07`).<br>**4. Trademark name clearance checklist execution** (`OPEN-03`). |
