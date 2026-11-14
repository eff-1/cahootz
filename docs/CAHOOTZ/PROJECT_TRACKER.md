---
title: "Project Tracker"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Project Tracker

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.


Nothing is marked Done or In Progress because no work has been verified as started. Update this file as the source of truth. Status: Not Started / In Progress / Review / Blocked / Done. Priority: Critical / High / Medium / Low.

## Master task tracker

| Task ID | Workstream | Task | Description | Priority | Status | Dependency | Owner | Acceptance Criteria | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Governance | Founder approval of blueprint v0.1 | Review all PROPOSED items; approve or amend | Critical | Done | — | Founder | Decision log updated (D-015–D-018); approved via master prompt | Starts project |
| T-002 | Legal | Engage Nigerian data-protection counsel | NDPA, GAID, DCPMI, DPIA, minors | Critical | Not Started | — | Founder | Written advice on OPEN-06, 07 | Budget needed |
| T-003 | Research | Student interviews at pilot campus | 15 to 20 interviews on study habits and partner needs | High | Not Started | OPEN-01 | Researcher | Findings summary; A-01 updated | — |
| T-004 | Branding | Name, trademark and domain checks | Availability and conflicts | High | Done | — | Founder | name-clearance-checklist.md created for founder action | OPEN-03 |
| T-005 | Product | Finalize MVP requirements and acceptance criteria | Detail stories per MVP module | High | Done | T-001 | Product | Project Understanding Report and shared schemas created | — |
| T-006 | Design | Design system v1 and core screens | Tokens, components, 8 key screens | High | Done | T-001 | Designer | Design tokens, Tailwind config, Button/Card/Input/Modal/Toast/Empty/Skeleton created | — |
| T-007 | Architecture | Repo, CI/CD and environments | Monorepo or repos, pipelines, IaC | High | Done | T-001 | Tech lead | Monorepo structure, docker-compose, CI workflow, strict tsconfig | — |
| T-008 | Architecture | Spike: Prisma vs Drizzle | Prototype key queries and migrations | Medium | Done | T-007 | Tech lead | Decision D-019 recorded (Prisma selected) | OPEN-08 |
| T-009 | Backend | Identity module | Auth, sessions, recovery, MFA optional | Critical | Done | T-007 | Backend | Acceptance criteria pass (18 tests green) | — |
| T-010 | Backend | Academic data model and admin import | Org tree, courses, import tool | Critical | Not Started | T-007 | Backend | Pilot catalogue loaded | OPEN-04 |
| T-011 | Backend | Verification flow | Email domain OTP and document review | High | Not Started | T-009, T-010 | Backend | Verification tests pass | OPEN-02 |
| T-012 | Backend | Discovery and invitations | Match scoring, limits, blocks | Critical | Not Started | T-010 | Backend | Perf and rule tests | — |
| T-013 | Backend | Study Together engine | State machine, timers, signals, events | Critical | Not Started | T-009 | Backend | Sequence tests; reconnect tests | OPEN-11 |
| T-014 | Frontend | Study Together UI | Lobby, active session, summary | Critical | Not Started | T-006, T-013 | Frontend | E2E journey passes | — |
| T-015 | Backend | XP and streaks ledger | Append-only XP, streak calc | High | Not Started | T-013 | Backend | Ledger tests | — |
| T-016 | Backend | Messaging basic | 1:1 chat, persistence, blocks | High | Not Started | T-009 | Backend | Delivery and order tests | — |
| T-017 | Backend | Communities basic | Course spaces, Q&A, moderation hooks | High | Not Started | T-010 | Backend | Community tests | — |
| T-018 | Safety | Reporting and moderation tooling | Report flow, queue, sanctions, appeals | Critical | Not Started | T-009 | Backend + Moderator | Moderation drill passes | OPEN-12 |
| T-019 | Security | Threat-model review and pen test | Fix findings before launch | Critical | Not Started | T-013 | Tech lead | No critical or high open | — |
| T-020 | Privacy | Privacy notice, consent records, data rights flow | Export and deletion | High | Not Started | T-002 | Backend + Counsel | Flows tested | — |
| T-021 | DevOps | Observability and backups | Dashboards, alerts, restore drill | High | Not Started | T-007 | DevOps | Restore tested | OPEN-10 |
| T-022 | QA | Test plan and automation | Playwright journeys, load tests | High | Not Started | T-005 | QA | CI suites running | — |
| T-023 | Analytics | Event taxonomy and dashboards | North Star and funnel | Medium | Not Started | T-005 | Product | Dashboard live | — |
| T-024 | Pilot | Pilot launch plan | Campus seeding, support, success criteria | High | Not Started | T-018, T-019 | Founder | Launch checklist done | — |


## Project status dashboard

| Item | Current state |
|---|---|
| Current phase | M1 Complete / Moving to M2 (Academic data and onboarding) |
| Completed workstreams | M0 (Validation & Decisions: T-001, T-004, D-012–D-018), M1 Foundations (T-005, T-006, T-007, T-008, T-009) |
| In-progress workstreams | M2 Academic data and onboarding (T-010, T-011) |
| Blocked items | None |
| Pending founder decisions | OPEN-01 (pilot institution data), OPEN-06, 07 (counsel engagement); safe defaults active |
| Major risks | R-01 cold start, R-05 false misses on poor networks, R-06 access control (mitigated by M1 auth/replay controls) |
| Next recommended actions | Proceed to M2: Academic data model, generic org-unit tree, pilot seeding script, onboarding flow |
| Completion percentages | M0: 100%, M1: 100% (33/33 tests passing) |

