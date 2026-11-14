---
title: "Contributor Guide and How to Continue Working on Cahootz"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Contributor Guide and How to Continue Working on Cahootz

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 25, E.

## 25. Project governance and collaborator onboarding

_Roles, principles, workflow and onboarding_


### Project overview for new collaborators

Cahootz is a proposed social learning platform for Nigerian university students. Its heart is Study Together: students find a partner from their own course, agree a timed session, and hold each other lightly accountable. Modules (Chapter 05) fit together as: identity and academic data, which feed discovery, which creates invitations, which create sessions, which generate XP and streaks, supported by communities, messaging and, later, AI. **Current phase: planning. No application code exists. The blueprint is a PROPOSED baseline awaiting founder approval.**


### Team responsibilities

| Role | Responsibilities |
|---|---|
| Founder / Product Owner | Owns vision and priorities; approves decisions and scope; accepts or rejects work; owns legal and financial decisions |
| Technical Lead | Owns architecture and standards; reviews significant changes; owns security and technical debt register |
| Backend Developer | Implements modules, APIs, data model, tests; follows domain boundaries |
| Frontend Developer | Implements UI to the design system; accessibility; performance on low-end devices |
| UI/UX Designer | Design system, flows, usability tests; hands off with specs and states |
| QA Engineer | Test plan, automation, release verification, acceptance sign-off |
| DevOps Engineer | Infrastructure as code, CI/CD, observability, backups, cost |
| Researcher | Student research, validation of assumptions, competitive monitoring |
| Moderator | Applies policy, handles reports and appeals, feeds back on policy gaps |

One person may hold several roles in an early team. The role is a hat, not a headcount.


### Working principles

1. No undocumented architectural decisions: record in the decision log.
2. No implementation without agreed requirements and acceptance criteria.
3. No bypassing security requirements, even for speed.
4. No unauthorized changes to shared interfaces (API contracts, events, schema); change through review.
5. All significant changes are reviewed by at least one other person.
6. Every feature has acceptance criteria.
7. Tests accompany critical functionality (state machine, ledgers, authorization).
8. Technical debt is recorded with owner and rationale.
9. Never invent facts, statistics or sources; mark unknowns as OPEN.


### Development workflow **[PROPOSED]**

| Topic | Recommendation |
|---|---|
| Git branching | Trunk-based with short-lived feature branches off main; protected main; release tags |
| Pull requests | Small, linked to an issue, description with what and why, screenshots for UI, checklist for tests, security and docs |
| Code review | At least one approval; reviewers check correctness, security, tests, boundaries, readability; no self-merge; response target one working day |
| Commit conventions | Conventional Commits (feat, fix, docs, refactor, test, chore) with scope = module |
| Issue tracking | One issue per deliverable; labels for module, priority, type; the tracker in this document maps to issues |
| Definition of Ready | Problem and user stated; acceptance criteria; designs or states defined; dependencies known; security and privacy impact noted; estimated |
| Definition of Done | Code reviewed and merged; tests pass; acceptance criteria met; docs and changelog updated; no new high security findings; observability added; feature flag if risky |
| Documentation | Docs live in the repo with the code; update the relevant specification in the same PR |
| Release management | Staging then production; feature flags; changelog; rollback plan; post-release checks |


### Contributor onboarding checklist

| # | Item | Where to find it |
|---|---|---|
| 1 | Understand what the project is | README.md, Chapter 01 |
| 2 | Understand why it exists | Chapters 01 and 02 |
| 3 | Know the current stage | Project status dashboard (Appendix D) |
| 4 | Know what has been finalized | Decision log (Appendix B): CONFIRMED items |
| 5 | Know what remains undecided | Open questions (Chapter 24) |
| 6 | Read the documents for your role | Role-to-document map below |
| 7 | Know your responsibilities | Chapter 25 team table |
| 8 | Know what to work on next | Project tracker (Appendix A), items Not Started with no unmet dependency |
| 9 | Know how to report progress | Progress-update template (Appendix E) |
| 10 | Know how to propose changes | Decision log entry plus pull request; change log updated |

| Role | Read first |
|---|---|
| Backend | Chapters 07, 08, 11, 16, 17, 18 |
| Frontend | Chapters 06, 07, 15, 18 |
| Designer | Chapters 04, 06, 07, 12, 15 |
| QA | Chapters 07, 20, 22 |
| DevOps | Chapters 11, 16, 19 |
| Moderator | Chapters 04, 12 |
| Researcher | Chapters 03, 23, 24 |


## Appendix E: HOW TO CONTINUE WORKING ON CAHOOTZ

_Context prompt and progress template_

Give the documentation folder (README.md, MASTER_BLUEPRINT.md, and the files it indexes) to Claude, ChatGPT or another capable assistant together with the prompt below. It also exists as CAHOOTZ_AI_CONTEXT_PROMPT.md.


### Reusable context-loading prompt

```text
You are joining the CAHOOTZ project as a product and engineering assistant.
Cahootz is a proposed social learning and student productivity platform for university students,
   starting in Nigeria.

I am supplying the project documentation. Follow these steps in order before answering anything
   else.

1. Read README.md and MASTER_BLUEPRINT.md to understand the product and the document map.
2. Read the module specifications relevant to my request (FEATURE_SPECIFICATIONS.md,
   SYSTEM_ARCHITECTURE.md, DATABASE_DESIGN.md, API_SPECIFICATION.md, SECURITY_AND_PRIVACY.md,
   MODERATION_POLICY.md as needed).
3. Read PROJECT_TRACKER.md and note each task status and dependencies.
4. Read DECISION_LOG.md and CHANGELOG.md to learn what was decided and what changed.
5. State the current project phase in one sentence, based only on the documents.
6. Separate CONFIRMED decisions (fixed), PROPOSED items (recommendations awaiting approval) and
   OPEN items (unresolved). Never treat PROPOSED or OPEN as settled.
7. List the outstanding founder decisions from OPEN_QUESTIONS.md, highest priority first.
8. Recommend the single next logical task, citing its tracker ID and any unmet dependency.
9. Do not repeat work already marked Done. Do not mark anything Done unless I confirm it.
10. Do not begin implementation (writing application code, migrations, infrastructure) unless
   the tracker shows approval for that work and I explicitly ask.

Rules for your answers:
- Never invent statistics, sources, competitor features, legal requirements or progress.
- If information is missing, say so and add it as an OPEN question.
- Flag anything needing qualified legal review.
- Propose documentation updates (decision log, change log, tracker) for every decision we make.
- Keep terminology consistent with the documents.

My request: [WRITE YOUR REQUEST HERE]
```


### Progress-update template

```text
CAHOOTZ PROGRESS UPDATE
Date:
Author / role:
Tracker task ID(s):

1. What I completed since the last update (with links to PRs or documents):
2. What I am working on now:
3. Status change for each task (Not Started / In Progress / Review / Blocked / Done), with
   evidence:
4. Blockers and who can unblock them:
5. Decisions made or needed (add to DECISION_LOG.md or OPEN_QUESTIONS.md):
6. Risks or new assumptions discovered:
7. Tests added or run, and results:
8. Documents updated (specification, changelog, tracker):
9. Next steps and expected review date:
```



## Appendix E: HOW TO CONTINUE WORKING ON CAHOOTZ

_Context prompt and progress template_

Give the documentation folder (README.md, MASTER_BLUEPRINT.md, and the files it indexes) to Claude, ChatGPT or another capable assistant together with the prompt below. It also exists as CAHOOTZ_AI_CONTEXT_PROMPT.md.


### Reusable context-loading prompt

```text
You are joining the CAHOOTZ project as a product and engineering assistant.
Cahootz is a proposed social learning and student productivity platform for university students,
   starting in Nigeria.

I am supplying the project documentation. Follow these steps in order before answering anything
   else.

1. Read README.md and MASTER_BLUEPRINT.md to understand the product and the document map.
2. Read the module specifications relevant to my request (FEATURE_SPECIFICATIONS.md,
   SYSTEM_ARCHITECTURE.md, DATABASE_DESIGN.md, API_SPECIFICATION.md, SECURITY_AND_PRIVACY.md,
   MODERATION_POLICY.md as needed).
3. Read PROJECT_TRACKER.md and note each task status and dependencies.
4. Read DECISION_LOG.md and CHANGELOG.md to learn what was decided and what changed.
5. State the current project phase in one sentence, based only on the documents.
6. Separate CONFIRMED decisions (fixed), PROPOSED items (recommendations awaiting approval) and
   OPEN items (unresolved). Never treat PROPOSED or OPEN as settled.
7. List the outstanding founder decisions from OPEN_QUESTIONS.md, highest priority first.
8. Recommend the single next logical task, citing its tracker ID and any unmet dependency.
9. Do not repeat work already marked Done. Do not mark anything Done unless I confirm it.
10. Do not begin implementation (writing application code, migrations, infrastructure) unless
   the tracker shows approval for that work and I explicitly ask.

Rules for your answers:
- Never invent statistics, sources, competitor features, legal requirements or progress.
- If information is missing, say so and add it as an OPEN question.
- Flag anything needing qualified legal review.
- Propose documentation updates (decision log, change log, tracker) for every decision we make.
- Keep terminology consistent with the documents.

My request: [WRITE YOUR REQUEST HERE]
```


### Progress-update template

```text
CAHOOTZ PROGRESS UPDATE
Date:
Author / role:
Tracker task ID(s):

1. What I completed since the last update (with links to PRs or documents):
2. What I am working on now:
3. Status change for each task (Not Started / In Progress / Review / Blocked / Done), with
   evidence:
4. Blockers and who can unblock them:
5. Decisions made or needed (add to DECISION_LOG.md or OPEN_QUESTIONS.md):
6. Risks or new assumptions discovered:
7. Tests added or run, and results:
8. Documents updated (specification, changelog, tracker):
9. Next steps and expected review date:
```

