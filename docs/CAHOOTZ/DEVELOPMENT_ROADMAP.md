---
title: "Development Roadmap, MVP Scope and Quality Assurance"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Development Roadmap, MVP Scope and Quality Assurance

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 20, 22.

## 20. Testing and quality assurance

_Test strategy and MVP acceptance criteria_

| Test type | Scope | Suggested tools **[PROPOSED]** |
|---|---|---|
| Unit | Domain logic: state machine, scoring, ledger math | Jest or Vitest |
| Integration | Services with real PostgreSQL and Redis in containers | Jest with Testcontainers |
| API | Contract and authorization tests per endpoint | Supertest, OpenAPI contract tests |
| End-to-end | Critical user journeys in browsers | Playwright |
| Realtime | Multi-client simulation, reconnect, clock skew | Socket.IO client scripts, Playwright with two contexts |
| Load | Heartbeat and chat load, DB under concurrency | k6 or Artillery |
| Security | SAST, dependency scan, DAST, access-control tests, pre-launch penetration test | Semgrep, npm audit or equivalent, OWASP ZAP |
| Accessibility | Automated plus manual keyboard and screen-reader tests | axe, Lighthouse, NVDA/VoiceOver |
| Regression | Automated suite in CI on every pull request | CI pipeline |
| Backup restoration | Quarterly timed restore drill | Runbook |


### Acceptance criteria for MVP features **[PROPOSED]**

| Feature | Acceptance criteria |
|---|---|
| Registration and verification | User can register, verify email and complete academic verification; invalid and rate-limited paths tested; no account enumeration |
| Academic onboarding | User can select institution, department, level and courses; missing institution request is created; data persisted and editable |
| Discovery | Only verified, opted-in users returned; blocked users excluded; filters correct; p95 under 500 ms at pilot scale |
| Invitations | Send, accept, decline, expire, withdraw; limits enforced; notifications delivered |
| Study session | State machine transitions valid only; timer drift under 1 second across clients; reconnect within grace restores state; no double rewards |
| Accountability signals | Ack inside window recorded; disconnection yields excused outcome; healthy-connection miss counted once; idempotent |
| Streaks and XP | Ledger entries match completed sessions; streak calculation passes timezone edge tests; reversal works |
| Messaging | Messages persist before broadcast; ordering preserved; blocked users cannot send |
| Communities | Auto-join by verified course; post, comment, report; moderator removal works |
| Reporting and moderation | Report creates queue item; moderator can act; audit record exists; appeal path works |
| Security gate | No critical or high findings open; cross-institution access tests pass |


## 22. MVP scope and development roadmap

_MVP cut, releases and milestones_

The MVP must prove one behaviour: **find a relevant partner, commit, study together, complete a session and return.** **[CONFIRMED]**


### Evaluation of proposed MVP features

| Feature | Decision **[PROPOSED]** | Reason |
|---|---|---|
| Authentication | Include | Required |
| Academic onboarding and institution selection | Include (one or two pilot institutions) | Core to relevance |
| Student profiles | Include (minimal) | Needed for discovery |
| Student discovery | Include | Core loop |
| Study invitations | Include | Core loop |
| One-on-one sessions, shared timer, accountability signals | Include | Signature feature |
| Basic streaks and XP | Include | Return behaviour |
| Basic messaging | Include (text, 1:1 and invitation-linked) | Coordination; keep small |
| Basic academic communities | Include (course space, Q&A, announcements) | Gives reason to visit; keep minimal |
| Reporting and moderation | Include, non-negotiable | Safety |
| AI assistant, document RAG | Exclude (R2) | Cost, privacy, evaluation effort |
| Video and audio | Exclude (R3) | Cost and safety |
| Virtual coins, rewarded ads, payments | Exclude (R3) | Legal and fraud complexity |
| Group sessions, study rooms | Exclude (R2) | Complexity after core proof |
| Native mobile apps | Exclude; use responsive web (PWA) | Speed |
| Cross-institution matching | Exclude (R2) | Needs data scale |


### Releases

| Release | Contents | Exit criteria **[PROPOSED]** |
|---|---|---|
| MVP | As above | Pilot cohort at one campus; session completion rate and week-one return meet targets set before launch |
| Release 2 | Group sessions, study rooms, AI assistant, resource library, cross-institution discovery, search | AI privacy tests pass; AI cost per active user within budget |
| Release 3 | Voice and video, coins and rewards, subscriptions, partner tools | Legal review done; moderation capacity scaled |
| Long-term | Mobile apps, multi-country, educator and institution products | Product-market fit evidence |


### Milestones (indicative, not a schedule) **[PROPOSED]**

| Milestone | Content | Depends on | Testing milestone |
|---|---|---|---|
| M0 Foundations | Repo, CI, environments, design system base, data model decisions | Founder approvals | CI green; security baseline |
| M1 Identity and academic data | Auth, onboarding, institution catalogue, verification | M0 | Auth and authorization tests |
| M2 Discovery and invitations | Profiles, availability, matching, invitations | M1 | Discovery performance test |
| M3 Study Together core | State machine, timer, presence, signals, completion | M2 | Realtime and reconnection tests |
| M4 Engagement and community | XP, streaks, messaging, communities | M3 | Ledger and concurrency tests |
| M5 Safety and operations | Reports, moderation tools, admin basics, privacy centre | M1-M4 | Pen test; accessibility audit |
| M6 Pilot launch | Closed beta, monitoring, support | M5 | Launch checklist |


### Team responsibilities **[PROPOSED]**

A small team can combine roles. Minimum: product owner (founder), full-stack engineers who share frontend and backend, a part-time designer, QA covered by engineers plus a tester, a part-time moderator and a legal adviser on call.


### Launch readiness checklist **[PROPOSED]**

- Privacy notice, terms, community rules published; legal review complete.
- DPIA done; registration obligations with NDPC determined. LEGAL REVIEW
- Security gate passed; backups restore tested; monitoring and alerting live.
- Moderation staffed, escalation tree defined, appeal path working.
- Support channel and on-call defined; kill switches tested.
- Pilot success metrics and baselines agreed.

