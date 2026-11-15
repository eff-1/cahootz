---
title: "Project Tracker"
project: CAHOOTZ
version: "v1.1-audit-verified"
date: "15 November 2026"
status: Backend & SQLite Persistence Verified (76/76 tests); External Infra & Live Browser Pending Host Binaries
---

# Project Tracker

> Version v1.1-audit-verified · 15 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Per the Founder Verification Audit, tasks with full command-output evidence (`76/76` automated tests passing + SQLite disk persistence + DB triggers) are marked **`Done`**, while tasks requiring external host binaries not installed on this machine (`PostgreSQL`, `Redis`, `Docker`, `k6`, `OWASP ZAP`) or a running Chrome remote-debugging session / hydrated Next.js frontend remain **`Built, unverified`**.

## Master task tracker

| Task ID | Workstream | Task | Description | Priority | Status | Dependency | Owner | Acceptance Criteria | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Governance | Founder approval of blueprint v0.1 | Review all PROPOSED items; approve or amend | Critical | Done | — | Founder | Decision log updated (D-015–D-018); approved via master prompt | Starts project |
| T-002 | Legal | Engage Nigerian data-protection counsel | NDPA, GAID, DCPMI, DPIA, minors | Critical | Not Started | — | Founder | Written advice on OPEN-06, 07 | External counsel needed |
| T-003 | Research | Student interviews at pilot campus | 15 to 20 interviews on study habits and partner needs | High | Not Started | OPEN-01 | Researcher | Findings summary; A-01 updated | Founder field action |
| T-004 | Branding | Name, trademark and domain checks | Availability and conflicts | High | Built, unverified | — | Founder | Checklist created; clearance pending founder execution | OPEN-03 |
| T-005 | Product | Finalize MVP requirements and acceptance criteria | Detail stories per MVP module | High | Done | T-001 | Product | Project Understanding Report and shared constants/schemas verified (`constants.test.ts`, `uuidv7.test.ts`) | Verified in `npm test` |
| T-006 | Design | Design system v1 and core screens | Tokens, components, 8 key screens | High | Built, unverified | T-001 | Designer | Static HTML WCAG/axe rules pass on 7 routes; live Chrome mobile check blocked by missing `DevToolsActivePort` | Audit item 6 & 8 |
| T-007 | Architecture | Repo, CI/CD and environments | Monorepo, pipelines, IaC | High | Done | T-001 | Tech lead | Monorepo structure, docker-compose, CI workflow, Terraform & Runbook on disk (`m7-analytics-pilot.test.ts`) | Verified in `npm test` |
| T-008 | Architecture | Spike: Prisma vs Drizzle & SQL Persistence | Prototype key queries and migrations | Medium | Built, unverified | T-007 | Tech lead | SQLite disk persistence survives API restart (`verification-audit.test.ts` Item 1); PostgreSQL/Redis not installed on host | Audit item 1 |
| T-009 | Backend | Identity module | Auth, sessions, recovery, MFA | Critical | Done | T-007 | Backend | Argon2id (`$argon2id$v=19$m=19456,t=2,p=1$`), rotating `HttpOnly; Secure; SameSite=Strict` cookie, server-side revocation, uniform errors, rate limits (`verification-audit.test.ts` Item 2) | Verified (`identity.test.ts` + Audit Item 2) |
| T-010 | Backend | Academic data model and admin import | Org tree, courses, import tool, seed | Critical | Done | T-007 | Backend | Deterministic pilot seed, mixed Faculty/College org tree, student profiles & enrolments survive SQLite restart | Verified (`m2-onboarding.test.ts` + Audit Item 1) |
| T-011 | Backend | Verification flow | Email domain OTP and self-declared onboarding | High | Done | T-009, T-010 | Backend | Self-declared onboarding + 6-digit institutional email OTP verified | Verified (`m2-onboarding.test.ts`) |
| T-012 | Backend | Discovery and invitations | Match scoring, limits, blocks, Study Now | Critical | Done | T-010 | Backend | Ranking, 30m Study Now expiry, 24h cooldown, per-object BOLA/IDOR returns 403/404 (`verification-audit.test.ts` Item 3) | Verified (`m3-discovery.test.ts` + Audit Item 3) |
| T-013 | Backend | Study Together engine | State machine, timers, signals, events | Critical | Done | T-009 | Backend | All 121 (27 valid + 94 invalid) transitions, 3-min disconnect = 0 penalty, <2s timer sync, duplicate/out-of-order events, ping idempotency (`verification-audit.test.ts` Item 4) | Verified (`m4-study-together.test.ts` + Audit Item 4) |
| T-014 | Frontend | Study Together UI | Lobby, active session, summary, dispute | Critical | Built, unverified | T-006, T-013 | Frontend | Server-rendered HTML routes & React `.tsx` templates exist, but client-side JS/WebSocket wiring & live Chrome check are unverified | Audit item 8 & 10 |
| T-015 | Backend | XP and streaks ledger | Append-only XP, streak calc, reliability | High | Done | T-013 | Backend | SQLite `BEFORE UPDATE`/`DELETE` trigger (`trg_xp_ledger_no_update`/`delete`) + `0.5^n` same-pair farming cap `[50, 25, 13, 6]` + 500 daily cap | Verified (Audit Item 4f & 9) |
| T-016 | Backend | Messaging basic | 1:1 chat, persistence, blocks, minor safety | High | Done | T-009 | Backend | Minor DM restriction, SQLite restart persistence, per-object BOLA/IDOR check (`GET /api/v1/messages/:id` returns 403 for User A) | Verified (`m5-safety-ops.test.ts` + Audit Item 1 & 3) |
| T-017 | Backend | Communities basic | Course spaces, Q&A, moderation hooks | High | Done | T-010 | Backend | Auto-join on enrolment, required course tag, accepted answers | Verified (`m5-safety-ops.test.ts`) |
| T-018 | Safety | Reporting and moderation tooling | Report flow, queue, sanctions, appeals | Critical | Done | T-009 | Backend + Moderator | Evidence snapshots, different-moderator appeals, DB-level immutable `audit_log` triggers (`trg_audit_log_no_update`/`delete`) | Verified (`m5-safety-ops.test.ts` + Audit Item 9) |
| T-019 | Security | Threat-model review and pen test | ZAP, dependency audit, secrets scan | Critical | Built, unverified | T-013 | Tech lead | Automated HTTP header/SQLi baseline, dependency & secrets scan (141 files, 0 secrets) pass; external OWASP ZAP container not installed on host | Audit item 6 |
| T-020 | Privacy | Privacy notice, consent records, data rights flow | Export and deletion | High | Done | T-002 | Backend + Counsel | DB-level immutable `consent_log` trigger, JSON export, 30d deletion, per-object BOLA/IDOR check (`GET /api/v1/privacy/export/:userId` returns 403 for User A) | Verified (Audit Item 3, 7, 9; legal text needs counsel review) |
| T-021 | DevOps | Observability and backups | Dashboards, alerts, restore drill | High | Built, unverified | T-007 | DevOps | Clean SQLite DB backup & restore drill matches 100% (`verification-audit.test.ts` Item 7); `pg_dump`/`pg_restore` pending PostgreSQL installation | Audit item 7 |
| T-022 | QA | Test plan and automation | Automated unit, integration, load & E2E | High | Built, unverified | T-005 | QA | 76/76 tests pass; Node 24 concurrent HTTP benchmark measured `p95 = 5.782ms`, `0%` errors (1,000 reqs / 50 VUs); `k6` binary not installed on host | Audit item 5 |
| T-023 | Analytics | Event taxonomy and dashboards | North Star and funnel | Medium | Done | T-005 | Product | North Star Weekly Active Study Completers & 6-stage funnel verified (`m7-analytics-pilot.test.ts`) | Verified in `npm test` |
| T-024 | Pilot | Pilot launch plan | Campus seeding, support, success criteria | High | Built, unverified | T-018, T-019 | Founder | Full honest stub/placeholder report delivered; awaiting real pilot institution catalogue (OPEN-01), counsel review (OPEN-06/07), and Postgres/Next.js deployment | Audit item 10 |

## Project status dashboard

| Item | Current state |
|---|---|
| Current phase | Verification Audit Complete (`14` tasks `Done`, `8` tasks `Built, unverified`, `2` founder tasks `Not Started`) |
| Automated Test Suite | `76 / 76` tests passing across `9` suites (`0` failures) |
| Persistence Verified | On-disk SQLite (`node:sqlite` WAL mode) with DB-level `BEFORE UPDATE` / `BEFORE DELETE` triggers on `audit_log`, `xp_ledger`, `session_events`, and `consent_log` |
| Unverified External Dependencies | `PostgreSQL`, `Redis`, `Docker`, `k6`, `OWASP ZAP` (binaries not installed on Windows host), and Chrome Remote Debugging (`DevToolsActivePort` not active) |
