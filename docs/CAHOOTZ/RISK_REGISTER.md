---
title: "Risk Register"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Risk Register

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.


Scale: Low, Medium, High, Very high. All statuses Open in this baseline.

| ID | Category | Risk | Likelihood | Impact | Priority | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| R-01 | Product | Cold start: not enough partners online at a campus | High | High | Critical | Seed one department; scheduled sessions; “looking now” signal; campus ambassadors | Founder | Open |
| R-02 | Product | Study Together mechanic feels punitive or gimmicky | Medium | High | High | Fair-play rules, mild consequences, pilot tuning | Product | Open |
| R-03 | Product | Competitors copy or already cover features | High | Medium | High | Focus on verified academic graph and local fit | Founder | Open |
| R-04 | Technical | Realtime state bugs corrupt sessions | Medium | High | High | Single-writer state machine, event log, tests | Tech lead | Open |
| R-05 | Technical | Unstable networks cause false misses | High | High | Critical | Heartbeat, grace, excused logic, low-data mode | Tech lead | Open |
| R-06 | Security | Account takeover or access-control flaw | Medium | Very high | Critical | MFA, rate limits, object-level tests, pen test | Tech lead | Open |
| R-07 | Privacy | NDPA non-compliance; DCPMI obligations missed | Medium | High | High | Legal review, DPIA, privacy lead | Founder + counsel | Open |
| R-08 | Privacy | AI leaks private documents | Low | Very high | High | Visibility filters, leak tests, no shared private index | AI lead | Open |
| R-09 | Financial | Coin fraud or unclear legal status | Medium | High | High | Defer coins; ledger; legal review | Founder | Open |
| R-10 | Financial | AI costs exceed budget | High | Medium | High | Quotas, small models, cost dashboards | Tech lead | Open |
| R-11 | Legal | Copyright claims on uploaded notes and past questions | Medium | Medium | Medium | Takedown process, terms, rights declaration | Counsel | Open |
| R-12 | Moderation | Harassment or unsafe contact between students | Medium | Very high | Critical | Contact limits, block, report, trained moderators | Safety lead | Open |
| R-13 | Moderation | Minors using the platform | Medium | High | High | DOB, restrictions, legal review | Founder | Open |
| R-14 | Adoption | Students do not verify academically | Medium | High | High | Multiple verification routes; tiered access | Product | Open |
| R-15 | Infrastructure | Poor latency from chosen region | Medium | Medium | Medium | Measure from Nigeria, choose region accordingly | DevOps | Open |
| R-16 | Operational | Founder or key person dependency | High | High | High | This documentation, onboarding, shared ownership | Founder | Open |
| R-17 | Operational | Brand name unavailable or conflicts | Medium | Medium | Medium | Trademark, company and domain checks | Founder | Open |

