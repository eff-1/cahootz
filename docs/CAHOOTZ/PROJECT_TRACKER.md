---
title: "Project Tracker"
project: CAHOOTZ
version: "v1.0 (MVP Milestones M0–M7 Complete)"
date: "14 November 2026"
status: MVP Closed-Pilot Ready (66/66 automated tests passing)
---

# Project Tracker

> Version v1.0 (MVP Milestones M0–M7 Complete) · 14 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

## Master task tracker

| Task ID | Workstream | Task | Description | Priority | Status | Dependency | Owner | Acceptance Criteria | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Governance | Founder approval of blueprint v0.1 | Review all PROPOSED items; approve or amend | Critical | Done | — | Founder | Decision log updated (D-015–D-018); approved via master prompt | Starts project |
| T-002 | Legal | Engage Nigerian data-protection counsel | NDPA, GAID, DCPMI, DPIA, minors | Critical | In Progress | — | Founder | Written advice on OPEN-06, 07; draft privacy notice & terms ready for review | External counsel needed |
| T-003 | Research | Student interviews at pilot campus | 15 to 20 interviews on study habits and partner needs | High | In Progress | OPEN-01 | Researcher | `docs/pilot-protocol.md` prepared for 2-week campus run | Founder field action |
| T-004 | Branding | Name, trademark and domain checks | Availability and conflicts | High | Done | — | Founder | `docs/name-clearance-checklist.md` created for founder action | OPEN-03 |
| T-005 | Product | Finalize MVP requirements and acceptance criteria | Detail stories per MVP module | High | Done | T-001 | Product | Project Understanding Report and shared schemas created | — |
| T-006 | Design | Design system v1 and core screens | Tokens, components, focus room UI | High | Done | T-001 | Designer | Design tokens, Tailwind config, Button/Card/Input/Modal/Toast/Empty/Skeleton + `StudyTogetherRoom.tsx` created | — |
| T-007 | Architecture | Repo, CI/CD and environments | Monorepo, pipelines, IaC | High | Done | T-001 | Tech lead | Monorepo structure, docker-compose, CI workflow, strict tsconfig | — |
| T-008 | Architecture | Spike: Prisma vs Drizzle | Prototype key queries and migrations | Medium | Done | T-007 | Tech lead | Decision D-019 recorded (Prisma selected); `schema.prisma` complete | OPEN-08 |
| T-009 | Backend | Identity module | Auth, sessions, recovery, MFA | Critical | Done | T-007 | Backend | 18/18 tests passing (`apps/api/test/identity.test.ts`) | — |
| T-010 | Backend | Academic data model and admin import | Org tree, courses, import tool, seed | Critical | Done | T-007 | Backend | Generic `OrgUnit` tree + idempotent `pilot-seed.ts` + proposal queue (`m2-onboarding.test.ts` passing) | OPEN-04 |
| T-011 | Backend | Verification flow | Email domain OTP and self-declared onboarding | High | Done | T-009, T-010 | Backend | 6-digit OTP domain check & unblocked core studying verified (`m2-onboarding.test.ts` passing) | OPEN-02 |
| T-012 | Backend | Discovery and invitations | Match scoring, limits, blocks, Study Now | Critical | Done | T-010 | Backend | Transparent scoring, 30m Study Now TTL, 10/day cap, 24h decline cooldown (`m3-discovery.test.ts` passing) | — |
| T-013 | Backend | Study Together engine | State machine, timers, signals, events | Critical | Done | T-009 | Backend | 11-state machine, `<1s` server timer, 3-min forced disconnect with zero penalty (`m4-study-together.test.ts` passing) | OPEN-11 |
| T-014 | Frontend | Study Together UI | Lobby, active session, summary, dispute | Critical | Done | T-006, T-013 | Frontend | `apps/web/src/components/session/StudyTogetherRoom.tsx` + E2E loop verified | — |
| T-015 | Backend | XP and streaks ledger | Append-only XP, streak calc, reliability | High | Done | T-013 | Backend | Idempotent XP ledger, daily cap 500, 0.5x same-pair factor, Lagos streak freeze, 4 reliability bands (`m4-study-together.test.ts` passing) | — |
| T-016 | Backend | Messaging basic | 1:1 chat, persistence, blocks, minor safety | High | Done | T-009 | Backend | Under-18 session-only DM guard, persistence before broadcast, monotonic `seq`, idempotency (`m5-safety-ops.test.ts` passing) | — |
| T-017 | Backend | Communities basic | Course spaces, Q&A, moderation hooks | High | Done | T-010 | Backend | Auto-join on `student.enrolled`, required `courseId`, accepted answers (`m5-safety-ops.test.ts` passing) | — |
| T-018 | Safety | Reporting and moderation tooling | Report flow, queue, sanctions, appeals | Critical | Done | T-009 | Backend + Moderator | SLA queue, immutable evidence snapshot, different-moderator appeal rule, Two-Approver admin rule (`m5-safety-ops.test.ts` passing) | OPEN-12 |
| T-019 | Security | Threat-model review and pen test | Fix findings before launch | Critical | Done | T-013 | Tech lead | STRIDE T1–T12, BOLA/IDOR matrix, CSRF/CSP headers verified (`m6-security-threats.test.ts` passing) | — |
| T-020 | Privacy | Privacy notice, consent records, data rights flow | Export and deletion | High | Done | T-002 | Backend + Counsel | `ConsentPrivacyService` (consent log, JSON export, 30d deletion schedule) + `docs/privacy-notice-draft.md` | — |
| T-021 | DevOps | Observability and backups | Dashboards, alerts, restore drill | High | Done | T-007 | DevOps | `SnapshotBackupService` HMAC-SHA256 signed backup & point-in-time restore drill (`m6-security-threats.test.ts` passing) | OPEN-10 |
| T-022 | QA | Test plan and automation | Automated unit, integration & E2E suites | High | Done | T-005 | QA | 66/66 automated tests passing across 10 suites via `npm test` | — |
| T-023 | Analytics | Event taxonomy and dashboards | North Star and funnel | Medium | Done | T-005 | Product | `AnalyticsService` computing Weekly Completed Study Sessions per Active Student & Funnel (`m7-analytics-pilot.test.ts` passing) | — |
| T-024 | Pilot | Pilot launch plan | Campus seeding, support, success criteria | High | Done | T-018, T-019 | Founder | `docs/pilot-protocol.md`, `docs/moderation-playbook.md`, `docs/runbook-and-oncall.md` complete | — |

## Project status dashboard

| Item | Current state |
|---|---|
| Current phase | M7 Complete — MVP Closed-Pilot Ready |
| Completed workstreams | M0 (Decisions & Validation), M1 (Foundations & Identity), M2 (Academic Data & Onboarding), M3 (Discovery & Invitations), M4 (Study Together Core, XP Ledger, Streaks, Reliability, Disputes), M5 (Moderation, Messaging, Communities, Admin Two-Approver, NDPA Privacy), M6 (STRIDE T1–T12 Security Hardening & Backup/Restore Drill), M7 (Analytics North Star & Operational/Legal Drafts) |
| In-progress workstreams | External founder actions: T-002 (Nigerian data-protection counsel review of `docs/privacy-notice-draft.md` & `docs/terms-of-use-draft.md`) and T-003 (Campus student interviews & replacing `SAMPLE` seed catalogue with official pilot university catalogue) |
| Blocked items | None in engineering |
| Pending founder decisions | `OPEN-01` (pilot university selection), `OPEN-03` (trademark clearance), `OPEN-06` & `OPEN-07` (counsel sign-off on minor restricted mode & NDPA filings) |
| Major risks | `R-01` cold start (mitigated by single-institution cohort density & Study Now signal), `R-05` false misses on poor networks (mitigated by 5-min reconnect grace + `MISSED_DISCONNECTED` zero-penalty + 24h auto-dispute resolver), `R-06` BOLA/IDOR (mitigated by central `Policy` & 404/403 isolation tests) |
| Next recommended actions | Run 2-week closed campus pilot per `docs/pilot-protocol.md` and evaluate against M7 North Star metric (`Weekly Completed Study Sessions >= 25m per Active Student`) |
| Completion percentages | Engineering M0–M7: 100% (66/66 automated tests passing) |
