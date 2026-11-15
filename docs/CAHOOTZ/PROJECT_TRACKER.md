---
title: "Project Tracker"
project: CAHOOTZ
version: "v1.2-phase2-real"
date: "15 November 2026"
status: Phase 2 Make-It-Real — Working Student UI, Real Playwright + axe-playwright E2E, Real Email Adapters & CI Pipeline Built; M4/M5/M6 Held at Built, unverified Pending External CI & Counsel
---

# Project Tracker

> Version v1.2-phase2-real · 15 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Per the Phase 2 directive:
- Milestones **M4 (`T-013`–`T-015`), M5 (`T-016`–`T-018`), and M6 (`T-019`–`T-022`)** are held at **`Built, unverified`** until external CI tools (`OWASP ZAP`, `k6` 5-minute 100-VU run) and counsel/production infrastructure checks complete.
- Local header/SQLi checks are labelled **smoke checks** (not OWASP ZAP), and local in-process concurrency runs are labelled **local micro-benchmarks** (not server capacity).
- Accessibility and mobile viewport checks are verified via real **`@axe-core/playwright`** and **Playwright headless Chromium** at `375x667` under Slow 3G CDP network throttling.

## Master task tracker

| Task ID | Workstream | Task | Description | Priority | Status | Dependency | Owner | Acceptance Criteria | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Governance | Founder approval of blueprint v0.1 | Review all PROPOSED items; approve or amend | Critical | Done | — | Founder | Decision log updated (D-015–D-021); D-020/D-021 marked PENDING founder | Starts project |
| T-002 | Legal | Engage Nigerian data-protection counsel | NDPA, GAID, DCPMI, DPIA, minors | Critical | Not Started | — | Founder | Written advice on OPEN-06, 07 | External counsel needed |
| T-003 | Research | Student interviews at pilot campus | 15 to 20 interviews on study habits and partner needs | High | Not Started | OPEN-01 | Researcher | Findings summary; A-01 updated | Founder field action |
| T-004 | Branding | Name, trademark and domain checks | Availability and conflicts | High | Built, unverified | — | Founder | Checklist created; clearance pending founder execution | OPEN-03 |
| T-005 | Product | Finalize MVP requirements and acceptance criteria | Detail stories per MVP module | High | Done | T-001 | Product | Project Understanding Report and shared constants/schemas verified (`constants.test.ts`, `uuidv7.test.ts`) | Verified in `npm test` |
| T-006 | Design | Design system v1 and core screens | Tokens, components, 8 key screens | High | Done | T-001 | Designer | Working student UI (`/app.js` + 7 routes) verified in headless Chromium via `@axe-core/playwright` (`0` WCAG 2.2 AA violations at `375x667`, `>= 44px` touch targets) | Verified in `playwright-e2e.spec.ts` |
| T-007 | Architecture | Repo, CI/CD and environments | Monorepo, pipelines, IaC | High | Done | T-001 | Tech lead | Node `24.18.1` pinned (`.nvmrc`, `.node-version`, `package.json`); `.github/workflows/ci.yml` configured with `npm test`, Playwright, `npm audit`, Gitleaks, OWASP ZAP baseline, and 5-min 100-VU `k6` | Verified on disk |
| T-008 | Architecture | Spike: Prisma vs Drizzle & SQL Persistence | Prototype key queries and migrations | Medium | Built, unverified | T-007 | Tech lead | SQLite (`node:sqlite` WAL mode) persistence survives API restart (`verification-audit.test.ts` Item 1); D-020 logged `PENDING founder`; PostgreSQL migration pending | D-020 (`PENDING founder`) |
| T-009 | Backend | Identity module | Auth, sessions, recovery, MFA | Critical | Done | T-007 | Backend | Argon2id (`$argon2id$v=19$m=19456,t=2,p=1$`), rotating `HttpOnly; Secure; SameSite=Strict` cookie, server-side revocation, uniform errors, rate limits (`verification-audit.test.ts` Item 2) | Verified (`identity.test.ts` + Audit Item 2) |
| T-010 | Backend | Academic data model and admin import | Org tree, courses, import tool, seed | Critical | Done | T-007 | Backend | Deterministic pilot seed with `SAMPLE — REPLACE BEFORE PILOT` markers, mixed Faculty/College org tree, student profiles & enrolments survive SQLite restart | Verified (`m2-onboarding.test.ts` + Audit Item 1) |
| T-011 | Backend | Verification flow | Email domain OTP and self-declared onboarding | High | Done | T-009, T-010 | Backend | Self-declared onboarding + 6-digit institutional email OTP + real `ResendEmailProvider` & `SmtpEmailProvider` adapters (`email-provider.test.ts`) | Verified (`m2-onboarding.test.ts` + `email-provider.test.ts`) |
| T-012 | Backend | Discovery and invitations | Match scoring, limits, blocks, Study Now | Critical | Done | T-010 | Backend | Ranking, 30m Study Now expiry, 24h cooldown, per-object BOLA/IDOR returns 403/404 (`verification-audit.test.ts` Item 3) + working UI invite/accept verified in Playwright | Verified (`m3-discovery.test.ts` + Playwright E2E) |
| T-013 | Backend | Study Together engine | State machine, timers, signals, events | Critical | Built, unverified | T-009 | Backend | All 121 (27 valid + 94 invalid) transitions, 3-min disconnect = 0 penalty, `<2s` timer sync across 2 Chromium contexts, duplicate/out-of-order events, ping idempotency verified locally; held at `Built, unverified` per Phase 2 M4 gate | Held at `Built, unverified` per Phase 2 rule |
| T-014 | Frontend | Study Together UI | Lobby, active session, summary, dispute | Critical | Built, unverified | T-006, T-013 | Frontend | Working client JS (`/app.js`) for shared server-synced timer, 15s heartbeats, ping banner (`"I'm here"`), pause/resume, complete, dispute form, 3-min offline auto-resume verified in Playwright Chromium at `375x667` Slow 3G; held at `Built, unverified` per Phase 2 M4 gate | Held at `Built, unverified` per Phase 2 rule |
| T-015 | Backend | XP and streaks ledger | Append-only XP, streak calc, reliability | High | Built, unverified | T-013 | Backend | SQLite `BEFORE UPDATE`/`DELETE` trigger (`trg_xp_ledger_no_update`/`delete`) + `0.5^n` same-pair farming cap `[50, 25, 13, 6]` + 500 daily cap + UI XP/streak display verified in Playwright; held at `Built, unverified` per Phase 2 M4 gate | Held at `Built, unverified` per Phase 2 rule |
| T-016 | Backend | Messaging basic | 1:1 chat, persistence, blocks, minor safety | High | Built, unverified | T-009 | Backend | Minor DM restriction, SQLite restart persistence, BOLA/IDOR 403 check, working UI message send + report/block verified in Playwright; held at `Built, unverified` per Phase 2 M5 gate | Held at `Built, unverified` per Phase 2 rule |
| T-017 | Backend | Communities basic | Course spaces, Q&A, moderation hooks | High | Built, unverified | T-010 | Backend | Auto-join on enrolment, required course tag, accepted answers verified in `m5-safety-ops.test.ts`; held at `Built, unverified` per Phase 2 M5 gate | Held at `Built, unverified` per Phase 2 rule |
| T-018 | Safety | Reporting and moderation tooling | Report flow, queue, sanctions, appeals | Critical | Built, unverified | T-009 | Backend + Moderator | Evidence snapshots, different-moderator appeals, DB-level immutable `audit_log` triggers, working UI report/block button verified in Playwright; held at `Built, unverified` per Phase 2 M5 gate | Held at `Built, unverified` per Phase 2 rule |
| T-019 | Security | Threat-model review and pen test | ZAP, dependency audit, secrets scan | Critical | Built, unverified | T-013 | Tech lead | `npm audit` (`0` vulnerabilities), secrets scan (`0` leaks), and HTTP header/SQLi **smoke checks** pass locally; `zaproxy/action-baseline` wired in `.github/workflows/ci.yml` awaiting GitHub Actions runner execution | Held at `Built, unverified` until CI ZAP run |
| T-020 | Privacy | Privacy notice, consent records, data rights flow | Export and deletion | High | Built, unverified | T-002 | Backend + Counsel | DB-level immutable `consent_log` trigger, working UI JSON export & 30d deletion verified in Playwright, BOLA/IDOR 403 check passes; awaiting Nigerian counsel review (`T-002`) | Held at `Built, unverified` per Phase 2 M6 gate |
| T-021 | DevOps | Observability and backups | Dashboards, alerts, restore drill | High | Built, unverified | T-007 | DevOps | Clean SQLite DB backup & restore drill matches 100% (`verification-audit.test.ts` Item 7); `pg_dump`/`pg_restore` pending PostgreSQL migration (`D-020`) | Held at `Built, unverified` per Phase 2 M6 gate |
| T-022 | QA | Test plan and automation | Automated unit, integration, load & E2E | High | Built, unverified | T-005 | QA | `80/80` Node unit/integration tests + `2/2` Playwright headless Chromium E2E & `@axe-core/playwright` tests pass locally; 5-min 100-VU `k6` scenario (`infra/k6/study-together-load.js`) wired in `.github/workflows/ci.yml` awaiting CI execution | Held at `Built, unverified` until CI `k6` run |
| T-023 | Analytics | Event taxonomy and dashboards | North Star and funnel | Medium | Done | T-005 | Product | North Star Weekly Active Study Completers & 6-stage funnel verified (`m7-analytics-pilot.test.ts`) | Verified in `npm test` |
| T-024 | Pilot | Pilot launch plan | Campus seeding, support, success criteria | High | Built, unverified | T-018, T-019 | Founder | Pilot seed keeps `SAMPLE — REPLACE BEFORE PILOT` markers until founder supplies real university & course catalogue (`OPEN-01`) | Waiting on founder (`OPEN-01`) |

## Project status dashboard

| Item | Current state |
|---|---|
| Current phase | Phase 2 Make-It-Real (`9` tasks `Done`, `13` tasks `Built, unverified` including all of M4/M5/M6, `2` founder tasks `Not Started`) |
| Unit & Integration Test Suite | `80 / 80` tests passing across `10` suites (`0` failures) |
| Real Browser E2E & Accessibility (`@axe-core/playwright`) | `2 / 2` Playwright headless Chromium suites passing (`0` WCAG 2.2 AA violations across all 7 routes at `375x667`; full 2-user Study Together loop under Slow 3G) |
| Persistence Verified | On-disk SQLite (`node:sqlite` WAL mode) with DB-level `BEFORE UPDATE` / `BEFORE DELETE` triggers on `audit_log`, `xp_ledger`, `session_events`, and `consent_log` (`D-020` `PENDING founder`) |
| Unverified External CI & Founder Items | `OWASP ZAP` and 5-minute 100-VU `k6` (configured in `.github/workflows/ci.yml`, binaries not installed on Windows host); real pilot catalogue (`OPEN-01`); NDPA counsel sign-off (`OPEN-06/07`) |
