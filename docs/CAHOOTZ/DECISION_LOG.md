---
title: "Decision Log and Change Log"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Decision Log and Change Log

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.


## Decision log

| Decision ID | Decision | Rationale | Alternatives considered | Approval status | Date | Impacted modules |
|---|---|---|---|---|---|---|
| D-001 | Product is web-first with future mobile apps | Brief | Native-first | CONFIRMED | 2026-11-05 | All |
| D-002 | Study Together is the signature feature | Brief | — | CONFIRMED | 2026-11-05 | Study sessions |
| D-003 | Keep XP and spendable coins separate; coins non-withdrawable | Brief | Single currency | CONFIRMED | 2026-11-05 | Wallet |
| D-004 | No random video matching; no recording by default | Brief | — | CONFIRMED | 2026-11-05 | Video, Moderation |
| D-005 | Modular monolith first | Founder preference in brief | Microservices | CONFIRMED | 2026-11-05 | Architecture |
| D-006 | Use append-only ledger for coins and XP | Brief | Editable balance | CONFIRMED | 2026-11-05 | Wallet |
| D-007 | MVP excludes AI, video, coins, groups | Focus on core loop; cost and safety | Include AI early | PROPOSED | 2026-11-05 | Roadmap |
| D-008 | Server-authoritative session timer and single-writer state machine | Correctness under concurrency | Client-driven timer | PROPOSED | 2026-11-05 | Study sessions |
| D-009 | Generic org-unit tree for academic structure | Institutional variation | Fixed faculty/department tables | PROPOSED | 2026-11-05 | Academic data |
| D-010 | Start with pgvector instead of a separate vector DB | Operational simplicity | Dedicated vector DB | PROPOSED | 2026-11-05 | AI |
| D-011 | North Star: Weekly Completed Study Sessions per Active Student | Captures core loop | DAU | PROPOSED | 2026-11-05 | Metrics |


| D-012 | Session completion threshold is 70% connected time (not 80%) | Founder execution prompt specifies 70%; FEATURE_SPECIFICATIONS.md said 80%. Execution prompt is the active instruction. | 80% (from spec) | CONFIRMED (founder prompt) | 2026-11-14 | Study sessions |
| D-013 | Dispute window is 24 hours (not 48) | Founder execution prompt M4 says 24h; spec state table said 48h. Following prompt. | 48h (from spec) | CONFIRMED (founder prompt) | 2026-11-14 | Study sessions |
| D-014 | Reliability bands: New, Building, Reliable, Very Reliable (4 bands) | Founder execution prompt specifies 4 bands; spec had 3 (Building, Steady, Reliable). | 3 bands (from spec) | CONFIRMED (founder prompt) | 2026-11-14 | Study sessions |
| D-015 | Founder approves MVP scope per execution prompt | Founder running the execution prompt constitutes approval of MVP scope (T-001). Excludes AI, video, coins, groups. Self-declared academic profile with email-domain verification. No real-money payments. | — | CONFIRMED (founder prompt) | 2026-11-14 | All |
| D-016 | Working name "Cahootz" in single config constant | Name kept in one constant for easy renaming. Never hard-coded in multiple places. | Hard-coded name | CONFIRMED (founder prompt) | 2026-11-14 | All |
| D-017 | One pilot institution, seeded data only | Per founder approval. Placeholder data marked SAMPLE until real institution data supplied. | Multiple institutions | CONFIRMED (founder prompt) | 2026-11-14 | Academic data |
| D-018 | Tech stack: Next.js, NestJS, PostgreSQL, Redis, Socket.IO, Tailwind, TypeScript strict | PROPOSED defaults from execution prompt Step 3. Monorepo with pnpm workspaces. | Alternative stacks | PROPOSED (defaulting) | 2026-11-14 | Architecture |
| D-019 | Choose Prisma as the ORM for Cahootz | Schema-first declarative modeling, automatic migration engine, type generation, and native NestJS modularity support | Drizzle ORM | PROPOSED (adopted) | 2026-11-14 | Database, all modules |

_Add new decisions as new rows. Never edit history; supersede with a new decision._
