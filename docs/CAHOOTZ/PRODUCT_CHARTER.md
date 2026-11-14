---
title: "Product Charter (vision, strategy, executive summary)"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Product Charter (vision, strategy, executive summary)

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 01, 02.

## 01. Executive summary

_What Cahootz is, why it exists and what to decide first_

**Cahootz** is a proposed social learning and student productivity ecosystem for university students, starting in Nigeria and web-first. Its working tagline is “Learn together. Go further.” **[CONFIRMED]**


### The problem

Studying is usually solitary, easy to postpone and weakly connected to the peers who share a student's exact courses. Students already improvise solutions: WhatsApp groups, Discord servers, library sessions, timer apps and general-purpose AI tools. These are fragmented. None of them, as far as this research found, ties together a verified academic identity, partner matching by course, a commitment mechanic with fair accountability, and course-aware study tools in one place. That last statement is a research finding limited to the products reviewed in Chapter 03, not a claim of uniqueness.


### The proposition

**Find your people. Stay accountable. Learn better.** **[CONFIRMED]** A student joins with their institution, department, level and courses, finds relevant study partners, agrees a timed Study Together session, and is held lightly accountable through shared timers and response signals. Completed sessions build streaks and XP. Community spaces and an AI study assistant support the days when no exam is near.


### Product pillars

| Pillar | What it does | Release |
|---|---|---|
| Academic identity | Verified institution, department, level, course enrolment | MVP |
| Study partner discovery | Match by course, availability, goals; invite, accept, block | MVP |
| **Study Together** (signature) | Shared timed sessions, accountability pings, streaks, reliability | MVP (one-on-one) |
| Academic communities | Institution and course spaces, moderated Q&A | MVP basic; later richer |
| AI study assistant | Course-aware explanation, flashcards, quizzes with citations | Release 2 |
| Communication | Direct and group messaging; voice and video inside accepted sessions | Messaging MVP basic; media later |
| Gamification and economy | XP, streaks, achievements; spendable coins later | XP MVP; coins Release 3 |


### Who it is for

Initial users are Nigerian university undergraduates. Later users: postgraduate students, students in other countries, and institutions as partners. Secondary-school students are explicitly out of scope until a separate child-safety design exists. **[PROPOSED]**


### Market opportunity, stated carefully

Several products address parts of this space (Chapter 03): live study rooms (Study Together, StudyStream), one-to-one body doubling (Focusmate), cooperative focus timers (Forest), flashcard and AI tools (Quizlet, Knowt). Because they exist and have large user bases, the demand for social accountability in studying is plausible. This version deliberately gives **no market-size, revenue or user-growth figure**, because none was verified. Sizing is an OPEN research task. **[OPEN]**


### What could make Cahootz differentiated

- **Academic graph, not just a timer.** Matching by real institution, department, level and course. Global study rooms usually match by subject or mood; Cahootz can match by shared exam. **[PROPOSED]**
- **Fair accountability.** Study Together distinguishes inactivity from inability to respond, using heartbeats, grace windows and excused intervals instead of surveillance. **[PROPOSED]**
- **Local fit.** Designed for unstable connectivity, shared devices and data cost. **[PROPOSED]**
- **Commitment between known partners** rather than random strangers, with safety controls. **[PROPOSED]**

> **Competitive reality check**  
> Forest already offers synchronized group focus where everyone shares a stake [[7]](references/REFERENCES.md#ref-7). Study Together and StudyStream run 24/7 study rooms [[3]](references/REFERENCES.md#ref-3)[[8]](references/REFERENCES.md#ref-8). An app called roomn describes matching with students “who actually show up” and building streaks together [[11]](references/REFERENCES.md#ref-11). Cahootz must not market itself as first or only. Its defensible edge, if any, is the verified academic graph plus fair, local-first accountability. This is a hypothesis to test, not a fact.


### Long-term direction

An interconnected learning ecosystem across institutions and countries, with intelligent tools grounded in verified academic resources. **[CONFIRMED]** Everything beyond the MVP is ambition, not commitment. **[PROPOSED]**


### Recommended first decisions for the founder

1. Approve the MVP scope in Chapter 22, especially the exclusions (no coins, no video, no AI in MVP).
2. Approve the modular monolith approach in Chapter 16.
3. Commission legal review of NDPA obligations, age policy and any future virtual currency (Chapters 11, 13).
4. Choose the pilot institution and verification method (Chapter 08, OPEN-01, OPEN-02).
5. Confirm the brand name through trademark, company-name and domain checks (OPEN-03).


## 02. Product vision and strategy

_Vision, positioning, principles and boundaries_


### Vision, mission, positioning

| Item | Statement | Status |
|---|---|---|
| Vision | A connected learning environment where students find their academic community, learn together, build meaningful relationships and achieve more through collaboration and technology. | **[CONFIRMED]** |
| Mission | Make studying less isolating, more engaging, accessible and consistent by connecting students with relevant people, resources, accountability systems and intelligent tools. | **[CONFIRMED]** |
| Value proposition | Find your people. Stay accountable. Learn better. | **[CONFIRMED]** |
| Positioning | The place where a student's real academic circle studies together. Not a social feed, not a generic timer, not an AI chatbot. | **[PROPOSED]** |
| Target | University students, beginning in Nigeria; web-first; mobile later. | **[CONFIRMED]** |


### Core principles

1. **Study first.** Every feature must connect to a studying outcome. **[PROPOSED]**
2. **Fairness over punishment.** Accountability must never punish connectivity, power or emergencies. **[CONFIRMED]**
3. **Safety by design.** No random video matching, no adult content, no dating dynamics. **[CONFIRMED]**
4. **Essential access stays free.** Core academic access cannot depend on buying virtual currency. **[CONFIRMED]**
5. **Auditable economy.** Any currency is a ledger, never an editable balance. **[CONFIRMED]**
6. **Evidence before claims.** No invented statistics or competitor features. **[CONFIRMED]**
7. **Simplicity before scale.** Modular monolith first; add complexity when signals demand it. **[CONFIRMED]**


### Strategic objectives

| Objective | Evidence it is working | Horizon |
|---|---|---|
| Prove the core loop: find partner, commit, study, complete, return | Completed sessions per active student; partner repeat rate | MVP pilot |
| Build trust through safety and fairness | Low report rate per 1,000 sessions; low excused-dispute reversal rate | MVP |
| Establish verified academic graph at pilot institutions | Verification completion rate | MVP |
| Add course-grounded AI without privacy incidents | AI weekly active use; citation click-through; zero cross-user leaks | Release 2 |
| Sustainable revenue that does not damage trust | Subscription conversion; student satisfaction | Release 3 |


### Boundaries: what Cahootz is and is not

| Cahootz is | Cahootz is not |
|---|---|
| A verified academic study network | A general social network or entertainment feed |
| A commitment and accountability tool between consenting students | A surveillance or proctoring tool (no screen recording, no keystroke tracking) |
| A place for moderated, course-relevant Q&A | An unmoderated confession or gossip space |
| An AI tool grounded in permitted academic sources | A tool that does assignments or exams for students |
| A platform with explicit camera and microphone consent | A random video chat service |

> **Confirmed versus proposed**  
> Items in the brief (vision, mission, tagline, Study Together as signature, modular monolith preference, safety exclusions, separation of XP and coins) are CONFIRMED. All numerical thresholds, ranking formulas, technology picks beyond the stated direction, and the MVP cut line are PROPOSED.


### Long-term opportunities **[PROPOSED]**

- Institution partnerships (verified rosters, official syllabi) to improve data quality.
- Cross-institution programme communities (for example, all second-year engineering students in Nigeria).
- Expansion to other countries through a country-agnostic academic model (Chapter 08).
- Educator tools and sponsored academic content, only after trust is established.

