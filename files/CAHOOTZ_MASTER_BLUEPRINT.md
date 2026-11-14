# CAHOOTZ — PRODUCT BLUEPRINT & TECHNICAL MASTERPLAN

**Product Vision, Functional Specifications, System Architecture, Security Strategy, Scalability and Development Roadmap**

Version v0.1 (Draft for founder review) · 5 November 2026 · Status: PROPOSED baseline · Not legal advice.

Labels: **[CONFIRMED]** founder-established · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

## Contents

- 01. Executive summary
- 02. Product vision and strategy
- 03. Market research and competitive analysis
- 04. User personas and access roles
- 05. Complete product module architecture
- 06. Detailed user journeys
- 07. Study Together: functional specification
- 08. Academic data and curriculum architecture
- 09. AI and learning intelligence
- 10. Social and communication architecture
- 11. Security, privacy and trust
- 12. Content moderation and student safety
- 13. Gamification and virtual economy
- 14. Business model and monetization
- 15. UX/UI and brand direction
- 16. Technical system architecture
- 17. Database architecture
- 18. API and realtime specifications
- 19. Scalability and performance
- 20. Testing and quality assurance
- 21. Administration and operations
- 22. MVP scope and development roadmap
- 23. Product metrics and success measurement
- 24. Risk register and open decisions
- 25. Project governance and collaborator onboarding
- A. Appendix A: Master project tracker
- B. Appendix B: Decision log, change log, assumptions and open questions
- C. Appendix C: Product Blueprint quality review
- D. Appendix D: Project status dashboard
- E. Appendix E: HOW TO CONTINUE WORKING ON CAHOOTZ
- F. Appendix F: Glossary and final status
- References

---

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


## 03. Market research and competitive analysis

_Verified research on competitors; gaps and hypotheses_

> **Method and limits**  
> Research was performed on 5 November 2026 using web search of official pages, app-store listings and third-party reviews. Third-party figures (user counts, prices) change often and are not audited. Where only a third-party source exists, the table says so. Nothing here is a verified market size. **[OPEN]**


### Competitor overview

| Product | Primary audience / core features | Model | Overlap with Cahootz |
|---|---|---|---|
| **Study Together** | Global students. Started on Discord; study rooms, goals, stats, community events, tutor help, Zoom-based rooms [[3]](references/REFERENCES.md#ref-3)[[5]](references/REFERENCES.md#ref-5). Its Discord listing showed about 1.06M members at retrieval [[4]](references/REFERENCES.md#ref-4). | Site states “100% free” [[3]](references/REFERENCES.md#ref-3). Other revenue not verified. | High on live study rooms; low on academic graph and course matching. |
| **StudyStream** | Students and professionals. 24/7 live video focus rooms, task and streak tracking, social feed, AI note-taker per its App Store text [[8]](references/REFERENCES.md#ref-8). | App with subscriptions not verified. | High on accountability presence; weak local academic context. |
| **Focusmate** | Anyone wanting body doubling. One-to-one video session of 25, 50 or 75 minutes with a matched partner [[1]](references/REFERENCES.md#ref-1). | Free tier of three sessions per week and a paid tier, per a third-party summary [[2]](references/REFERENCES.md#ref-2). | High on the accountability concept; strangers, not course peers. |
| **Forest** | Individuals wanting phone-free focus. Plant a virtual tree; leaving the app kills it. Plant Together: shared room where one person giving up affects everyone [[6]](references/REFERENCES.md#ref-6)[[7]](references/REFERENCES.md#ref-7). | Core free; paid Plus tier [[7]](references/REFERENCES.md#ref-7). | **High on Study Together concept** (shared stake) but phone-app centric and no academic graph. |
| **Discord** | General communities; widely used by students for study servers and voice rooms [[20]](references/REFERENCES.md#ref-20). | Platform; not study-specific. | Medium: communities and voice, but no verification or study mechanics. |
| **Quizlet** | Flashcards and study sets; AI features. Pricing varies by source and changes; verify on vendor page [[12]](references/REFERENCES.md#ref-12)[[13]](references/REFERENCES.md#ref-13). | Freemium. | Low-medium: AI study tools only. |
| **Knowt** | AI flashcards, notes and practice tests; positioned as a free Quizlet alternative [[12]](references/REFERENCES.md#ref-12)[[13]](references/REFERENCES.md#ref-13). | Freemium; paid tiers raise AI limits [[12]](references/REFERENCES.md#ref-12). | Low-medium: AI study tools; no social accountability. |
| **roomn** | Students seeking study partners; describes matching with students who show up, live classrooms and streaks [[11]](references/REFERENCES.md#ref-11). | Free with in-app purchases per listing [[11]](references/REFERENCES.md#ref-11). | **High on partner matching and streaks.** Early-stage; scale unknown. |
| **myStudyFocus** | Nigerian tertiary students; academic activity management app [[14]](references/REFERENCES.md#ref-14). | Not verified. | Low-medium: local student productivity, not social study. |
| **Studyverse** | Virtual study halls. One source reports it has shut down [[9]](references/REFERENCES.md#ref-9); another lists the company as active [[10]](references/REFERENCES.md#ref-10). | Not verified. | Status uncertain. **[OPEN]** |
| **Studaily** | Named in the brief. No verifiable official source was found in this pass. | Unknown | Cannot assess. **[OPEN]** |

Nigerian context: a 2025 roundup of study apps for Nigerian students lists mostly general tools (exam practice, Forest, AI assistants) [[15]](references/REFERENCES.md#ref-15), which suggests, but does not prove, that a local verified-peer study network is not yet dominant. Further primary research with students is needed. **[OPEN]**


### Gaps Cahootz might address **[PROPOSED]**

- Course-level peer matching inside a verified institution, which global rooms do not do by design.
- Accountability that is fair under bad connectivity.
- A single place linking partner, session, community and course-aware AI.
- Pricing and bandwidth assumptions suited to Nigerian students (to be validated).


### SWOT analysis

| Strengths **[PROPOSED]** | Weaknesses **[PROPOSED]** |
|---|---|
| Clear signature feature with a rigorous fairness design. Academic graph. Focused initial market. | New brand with no network. Cold-start problem (partners only help if others are online). Small founding team likely. Dependence on verification data quality. |

| Opportunities **[PROPOSED]** | Threats **[PROPOSED]** |
|---|---|
| Institution partnerships. Under-served local context. AI tools grounded in verified syllabi. Cross-campus communities. | Forest, StudyStream, Study Together can add academic features. Free AI tools reduce the AI value. Regulatory burden (NDPA). Moderation cost. Connectivity and data cost for users. |


### Where Cahootz can differentiate, and what must be proven

| Hypothesis | How to test | Status |
|---|---|---|
| Students prefer partners from their own course over strangers | Pilot A/B: course-matched vs open-pool invitations; compare acceptance and completion | **[OPEN]** |
| Fair accountability beats strict accountability | Compare completion and complaint rates between configurations | **[OPEN]** |
| Students will verify academically for access to partners | Verification completion funnel at pilot campus | **[OPEN]** |
| Cold start can be solved campus-by-campus | Seed one department; track time-to-first-match | **[OPEN]** |

> **Claim discipline**  
> Cahootz marketing and this document must not claim it is the first or only platform with partner matching, shared timers, streaks or study rooms. The evidence above shows each exists elsewhere.


## 04. User personas and access roles

_Who uses Cahootz and what each role may do_


### Personas **[PROPOSED]**

| Persona | Profile | Needs | Pain points |
|---|---|---|---|
| **Ada, 300-level Computer Science** (university student) | Studies at a Nigerian university, shares a phone and laptop, intermittent power | Find course mates, stay consistent before exams | Procrastination, isolation, WhatsApp noise, data cost |
| **Tunde, study partner** | Same course, different study hours | Reliable partner who shows up | Flaky partners; fear of awkward rejection |
| **Group member** | Part of a four-person revision group | Shared timer, group goals | Coordinating time, one person carrying the group |
| **Community moderator (student)** | Senior student volunteer | Tools to keep Q&A on topic | Burnout, abuse, no authority tools |
| **Contributor** | Student or lecturer sharing notes | Credit and control over sharing | Copyright worries, misuse of notes |


### Roles and permission boundaries **[PROPOSED]**

| Role | Scope | Can | Cannot |
|---|---|---|---|
| Student | Own account; verified institution | Profile, discovery, sessions, communities, messaging, AI within quota, report/block | Moderate others, see private data of others |
| Study partner / group member | Specific session or group | Pause, ping, ack, leave, dispute | Change another's record |
| Community moderator | One community | Pin, remove posts, mute members in that community, escalate | Ban site-wide, view private messages, change roles above |
| Platform moderator | Global content | Review reports, apply temporary restrictions, escalate | Change wallet, change academic data, grant roles |
| Institution administrator (future) | One institution | Verify students, manage official course data, post announcements | See private messages or other institutions' data |
| Platform administrator | Operations | Manage institutions, verification queue, support tools | Impersonate users silently; edit ledger entries |
| Super administrator | Governance | Grant admin roles, view audit logs, manage feature flags | Bypass audit logging; access is time-boxed and reviewed |
| Resource contributor | Own uploads | Upload, version, delete own resources | Mark resources as official |
| Educational partner (future) | Contracted scope | Provide official resources, analytics on aggregate data | Access individual student data without consent and contract |


### Institution verification versus registration

Registration proves control of an email or phone number. **Academic verification** proves a claimed institutional affiliation. They are separate states. **[PROPOSED]** An unverified user can browse limited public content but cannot appear in institution-scoped discovery. Options for verification, ranked by assurance:

| Method | Assurance | Cost / friction | Notes |
|---|---|---|---|
| Institutional email domain OTP | Medium-high | Low, if the institution issues student email | Many Nigerian students may not have institutional email. Coverage is OPEN. **[OPEN]** |
| Student ID or admission document upload + manual review | Medium | High staff cost; sensitive document handling | Needs strict retention and access rules |
| Portal-based or partner roster check | High | Requires institution agreement | Best long-term |
| Peer vouching + low-trust tier | Low | Low | Only as a temporary fallback, with feature limits |

> **Founder decision needed**  
> Which verification method is acceptable at launch, and which features unverified users may use (OPEN-02).


## 05. Complete product module architecture

_22 requested modules plus 6 added by the blueprint team_

Each module below lists purpose, users, key functionality, permissions and business rules, edge cases and risks, dependencies, and release class (MVP, R2, R3, Later). Module numbers follow the brief; modules 23 to 28 are added by the blueprint team to close gaps. **[PROPOSED]**


### Modules 1 to 8: identity, academics, discovery and sessions

| # | Module and purpose | Main functionality and rules | Edge cases and risks | Depends on | Rel. |
|---|---|---|---|---|---|
| 1 | **Authentication and identity**. Prove who the account holder is. | Email or phone signup, verify, login, device sessions, recovery, MFA optional. Rules: one verified identity per account; rate-limited attempts. | Shared phones; SIM swap; lost email; credential stuffing | Notifications | MVP |
| 2 | **Academic onboarding**. Capture academic context. | Country, institution, faculty, department, programme, level, session, semester, courses, interests. Rule: courses from catalogue or request-to-add. | Missing institution; wrong level; carry-over courses | 3, 8 | MVP |
| 3 | **Institution management**. Maintain institution data. | Directory, aliases, structures, verification config. Rule: only admins edit official data. | Duplicate names; renamed institutions; differing structures | 8, 21 | MVP |
| 4 | **Student profiles**. Controlled self-presentation. | Display name, avatar, bio, courses, availability, goals, reliability badge, visibility settings. Rule: private by default beyond institution. | Doxxing; impersonation; real-name disclosure | 1, 2 | MVP |
| 5 | **Student discovery**. Find relevant students. | Filters: course, level, department, availability, goal, language, timezone. Rule: only verified, opted-in users appear. | Harassment by repeated search; scraping | 4, 6, 20 | MVP |
| 6 | **Study partner matching**. Rank and propose partners. | Transparent scoring (course overlap, schedule overlap, reliability, goals). Invite, accept, decline, mute, block. Rule: invitation rate limits. | Spam invitations; popularity bias; cold start | 5, 7 | MVP |
| 7 | **Study Together**. Commit and study together. | Chapter 07. Sessions, timers, pings, streaks, reliability. | Disconnection, disputes, gaming | 1, 6, 15 | MVP |
| 8 | **Study rooms**. Persistent small rooms for repeat partners or groups. | Private rooms with member list, shared goals, scheduled sessions. Rule: membership invite-only. | Room hijack; abandoned rooms | 7, 11 | R2 |


### Modules 9 to 15: community, messaging, AI and notifications

| # | Module and purpose | Main functionality and rules | Edge cases and risks | Depends on | Rel. |
|---|---|---|---|---|---|
| 9 | **Academic communities**. Institution and course spaces. | Auto-join by verified course; announcements; roles. Rule: scoped to institution; moderators appointed. | Off-topic drift; moderator abuse | 2, 20 | MVP basic |
| 10 | **Discussion and Q&A**. Useful academic contribution. | Questions, answers, accept answer, tags, upvotes. Rule: rate limits, quality signals over raw likes. | Cheating requests; misinformation | 9, 20 | MVP basic |
| 11 | **Messaging**. Direct and group chat. | 1:1 and group chat, delivery states, attachments, mute, block. Rule: DMs only between users who share a course or accepted invite. | Harassment; spam; content in private chats | 1, 20 | MVP basic |
| 12 | **Voice and video**. Co-presence in sessions. | Opt-in audio/video inside accepted sessions; camera off by default; no recording by default. | Bandwidth; exposure; abuse | 7, 11, 20 | R3 |
| 13 | **AI study assistant**. Course-aware help. | Chat, summarize, flashcards, quizzes, with citations. Rule: private materials never cross users. | Hallucination; cost; prompt injection; privacy | 14 | R2 |
| 14 | **Academic resource management**. Store and verify resources. | Upload, scan, tag, version, official vs community label, takedown. | Copyright; malware; low quality | 3, 20 | R2 |
| 15 | **Notifications**. Timely, respectful nudges. | In-app, email, web push; preferences; quiet hours. Rule: no dark patterns. | Alert fatigue; delivery failure; cost | 1 | MVP |


### Modules 16 to 28: economy, safety, operations

| # | Module and purpose | Main functionality and rules | Edge cases and risks | Depends on | Rel. |
|---|---|---|---|---|---|
| 16 | **XP and achievements**. Recognize effort. | Append-only XP ledger; levels; badges. Rule: XP is non-spendable. | Farming; inflation | 7 | MVP basic |
| 17 | **Virtual wallet**. Hold coins. | Double-entry ledger, balances derived. Rule: no cash-out; no transfer by default. | Fraud; chargebacks; regulation | 18, 19 | R3 |
| 18 | **Rewards**. Redeemable perks. | Catalogue, limits, entitlements. | Abuse; unfair access | 16, 17 | R3 |
| 19 | **Advertising and monetization**. Revenue. | Subscriptions first; sponsored academic content; rewarded ads later. | Trust loss; ad fraud; child safety | 17 | R3 |
| 20 | **Moderation and reporting**. Safety. | Report flows, queue, actions, appeals, evidence retention. | Moderator load; false reports | All social modules | MVP |
| 21 | **Administration dashboard**. Operate the platform. | User, institution, verification, reports, flags, audit view. | Privilege abuse | 20, 22 | MVP basic |
| 22 | **Analytics and insights**. Measure and learn. | Event tracking, product metrics, privacy-preserving aggregates. | Over-collection; vanity metrics | All | MVP basic |
| 23 | **Consent and privacy centre** (added). User data rights. | Consent records, export, deletion, visibility controls. | Deletion vs retention conflicts | 1 | MVP |
| 24 | **Support and help** (added). Resolve issues. | Help centre, ticketing, session-dispute intake. | Support load | 21 | MVP basic |
| 25 | **Feature flags and experiments** (added). Safe rollout. | Flags, staged rollout, kill switches. | Flag debt | 21 | MVP |
| 26 | **Search** (added). Find courses, people, posts. | Postgres full-text first; dedicated engine later. | Relevance; privacy leakage | 9,10 | R2 |
| 27 | **Onboarding and education content** (added). Teach the product. | Guided first session, tooltips, fair-play rules. | Drop-off | 1,2 | MVP |
| 28 | **Calendar and reminders** (added). Scheduled sessions. | Session schedule, reminders, ICS export. | Time zones, DST-free Nigeria but other countries differ | 7,15 | MVP basic |

Missing capabilities flagged for founder attention: offline-tolerant behaviour, low-data mode, accessibility, data-subject request handling, and a trust and safety operations process. These are cross-cutting and appear in later chapters. **[PROPOSED]**


## 06. Detailed user journeys

_End-to-end flows with alternatives and failures_

![Figure 1. Core journey from visitor to completed first session](CAHOOTZ/images/d07_journey.png)

*Figure 1. Core journey from visitor to completed first session*

The diagram shows the happy path. Alternative paths and failure conditions follow for each journey. **[PROPOSED]**

| Journey | Steps (happy path) | Alternatives and failures |
|---|---|---|
| First-time visitor | Land, see value, view sample partner cards (no personal data), sign up. | Slow network: lightweight page; unsupported browser notice. |
| Registration | Email or phone, password or passkey, verify code, accept terms and privacy notice. | Wrong code, expired code, duplicate account, disposable email blocked, rate limit hit. |
| Student onboarding | Choose country, institution, department, programme, level, session, courses, interests. | Institution missing: request queue. Course missing: request. Under-18 declared: restricted path (Chapter 12). |
| Academic verification | Choose method, submit code or document, wait for status, receive result. | Rejected: reason and retry; manual review queue; document deleted after decision per retention rule. |
| Complete profile | Display name, avatar, bio, availability, goals, privacy choices. | Inappropriate avatar: automated and manual review. |
| Find a study partner | Open Discover, filter by course and time, view cards, send invite with message. | No matches: widen filters, join community, set “looking now” signal. |
| Send/accept invitations | Send, partner notified, accept or decline, session created. | Expired, withdrawn, blocked sender, invitation limit reached. |
| Start a session | Both open lobby, ready check, server starts timer. | Partner no-show: wait window, then EXPIRED with no penalty to the present student. |
| Respond to accountability signal | Receive ping, tap acknowledge within window. | Offline: grace and excused interval (Chapter 07). |
| Complete a session | Timer ends, summary, reflect on goal, XP and streak awarded, rebook prompt. | Early finish by consent; partial credit rules. |
| Handle failed session | State ABANDONED or EXPIRED, reason shown, dispute option. | Dispute reviewed within SLA; outcome may restore streak. |
| Join communities | Auto-suggested by verified courses, join, read rules. | Private or full communities; moderator approval. |
| Ask questions | Post with course tag, similar-question suggestions, receive answers, accept one. | Rule violation: hold for review; academic misconduct flag. |
| Upload study materials | Select file, declare ownership and type, scan, publish as community material. | Malware, copyright claim, duplicate; takedown path. |
| Use AI assistant (R2) | Pick course, ask or upload, receive cited answer, save flashcards. | Quota reached; no source found; unsafe request. |
| Earn and spend coins (R3) | Complete sessions, earn XP always; coins via capped rules; spend on cosmetics. | Reversal after dispute; fraud hold; refund. |
| Report content | Tap report, pick reason, add note, submit, receive receipt. | Duplicate report; abusive reporting; urgent safety escalation. |
| Block another user | Block from profile or chat; mutual invisibility; sessions cancelled. | Shared community: content still visible but interactions blocked. |
| Recover an account | Request reset, verify, set new credential, review active sessions. | Lost email: manual recovery with strict proof; cooling-off period. |


### Sequence: first successful session

![Figure 2. Sequence diagram: successful Study Together session](CAHOOTZ/images/d09_seq_success.png)

*Figure 2. Sequence diagram: successful Study Together session*

See Chapter 07 for the interrupted-session sequence and the state machine.


## 07. Study Together: functional specification

_State machine, timers, pings, fairness, streaks, disputes_

Study Together is the signature feature **[CONFIRMED]** and is specified as a standalone system. All numbers below are PROPOSED defaults, to be tuned by pilot data. **[PROPOSED]**


### Design goals

- Make commitment real: a shared, authoritative timer and a visible partner.
- Make accountability **fair**: distinguish inactivity from inability to respond.
- Avoid invasive surveillance: no screen capture, no keystroke or app tracking, no mandatory camera.
- Be resilient: sessions survive refreshes, brief drops and device switches.
- Be hard to game: rewards depend on server-verified events.


### Session lifecycle and state machine

![Figure 3. Study session state machine](CAHOOTZ/images/d03_state.png)

*Figure 3. Study session state machine*

| State | Meaning | Allowed next states | Who can trigger |
|---|---|---|---|
| CREATED | Host drafted session | INVITED, CANCELLED | Host |
| INVITED | Invites sent | SCHEDULED, READY, EXPIRED, CANCELLED | Invitee accepts; host cancels; system expires |
| SCHEDULED | Future start agreed | READY, CANCELLED | System at T-10 min; host or all-but-one |
| READY | Lobby open | ACTIVE, EXPIRED | Participants ready (quorum); system on no-show |
| ACTIVE | Timer running | PAUSED, COMPLETED, ABANDONED | Participants (pause); system (end, abandon) |
| PAUSED | Agreed break | ACTIVE, ABANDONED | Any participant resumes; system on break timeout |
| COMPLETED | Finished normally | DISPUTED | System; dispute by participant within 48h |
| ABANDONED | Quorum lost beyond grace or all left | DISPUTED | System |
| EXPIRED / CANCELLED | Never started | terminal | System / host |
| DISPUTED | Under review | COMPLETED, ABANDONED | Moderator or automated rule |

Invalid transitions are rejected by the server and logged. Every transition writes an append-only `session_events` row and is performed by a single writer per session to avoid races. **[PROPOSED]**


### Configuration at creation

| Setting | Options | Default **[PROPOSED]** |
|---|---|---|
| Participants | 2 (MVP); up to 5 (R2 small group) | 2 |
| Duration | 15 minutes to 4 hours (example in brief: four hours) | 60 minutes |
| Cycle | Continuous or focus and break blocks | 50 / 10 |
| Ping policy | Off, light (1 per 25 min), custom | Light |
| Response window | 30 to 180 seconds | 90 seconds |
| Camera/audio | Off in MVP | Off |
| Goal text | Each participant states a goal | Required, short |


### Shared timer and realtime synchronization

- **Server-authoritative time.** The server stores `startedAt` and `endsAt`. Clients render countdowns from a server-time offset measured at connect, so client clocks do not matter.
- **Snapshot plus events.** On connect or reconnect the client fetches a full snapshot, then applies events from the last sequence number. Idempotent event ids prevent double processing.
- **Transport.** WebSocket (Socket.IO) with automatic reconnection and long-polling fallback, appropriate for unstable networks. **[PROPOSED]**
- **WebRTC is not needed** for timers or pings; it is introduced only for audio/video in Release 3.


### Presence and heartbeats

Each client sends a heartbeat every 15 seconds while the tab is visible and every 30 seconds in the background. Redis keys with a time-to-live of 45 seconds represent presence. Presence has three values: **PRESENT**, **AWAY_UNREACHABLE** (heartbeat lost) and **OFFLINE_EXCUSED** (within grace after a verified disconnection). Heartbeats prove a connected client, not attention, and the product says so honestly. **[PROPOSED]**


### Accountability signals (pings)

1. Sender sends ping. The server creates a signal with a deadline = now + response window.
2. Recipient sees an in-app prompt and, if the tab is hidden, a web-push or title flash.
3. One tap acknowledges. A trivial action is deliberate: the goal is presence, not a quiz.
4. If acknowledged by the deadline: *responded*. Else: the server checks presence. If heartbeats were lost for part of the window the result is *unreachable (excused)*. If heartbeats were healthy but no ack: *missed*.
5. Only *missed* counts against commitment, and a single miss never ends a session.

> **Why this is fair**  
> The system never punishes a missed ping when the client was disconnected, in a different app on a mobile browser, or covered by an agreed break. It only counts a miss when the connection was demonstrably healthy and the student did not respond. Repeated misses are shown to the partner as a gentle flag first, not an automatic penalty.


### Pause, breaks and grace periods

- **Agreed break.** Any participant can request; others acknowledge; breaks have a maximum length (default 10 min).
- **Reconnection grace.** 5 minutes after heartbeat loss before a participant is considered away; 10 minutes before the session can be marked ABANDONED for lack of quorum.
- **Emergency exit.** A one-tap “I have to go” records a consented leave without penalty, with limited use per week to deter abuse.
- **Excused interval.** Participants can attach a short technical-issue note; patterns are monitored.

![Figure 4. Sequence diagram: interrupted session with reconnection](CAHOOTZ/images/d10_seq_interrupt.png)

*Figure 4. Sequence diagram: interrupted session with reconnection*


### Completion criteria

| Criterion | Rule **[PROPOSED]** |
|---|---|
| Completed | Timer reaches end and each participant was present for at least 80% of active time (excused intervals excluded from the denominator). |
| Partial | Participant present at least 50% but left by consent: partial XP, streak unaffected. |
| Abandoned | Fewer than quorum present beyond grace: no completion rewards for anyone. No penalty to the participant who stayed. |
| Group | At least two participants present for the session to count; each participant judged on own presence. |


### Streaks, reliability, rewards and penalties

- **Streak.** Consecutive days with at least one completed session of 25 minutes or more. One “freeze” per 14 days. Based on the user's configured timezone.
- **Reliability.** A rolling 30-session score derived from: attended / scheduled, completed / started, and missed pings with healthy heartbeat. Shown to partners as bands (Building, Steady, Reliable), not a raw number, to reduce shaming. Excused events are excluded.
- **Rewards.** XP on completion scaled by duration up to a daily cap. No coins in MVP.
- **Penalties are mild.** No negative XP. Consequences: temporary pause in session invitations after repeated no-shows, and reliability band changes. No financial penalties.


### Disputes and fraud prevention

| Scenario | Handling |
|---|---|
| Partner says “you left” but heartbeat shows present | Event log is the evidence. Auto-resolve in favour of the log. |
| Both claim the other disconnected | Compare log; if inconclusive, no penalty to either; reward reduced. |
| Collusion: two accounts start long sessions and idle for XP | Presence quality checks (interaction diversity), daily caps, rate limits per pair, anomaly flags for review. |
| Multi-account farming | Verified academic identity, device and rate signals, manual review for outliers. |
| Client tampering (fake heartbeat) | Server-side authority; heartbeats must carry a signed session token; this cannot prove attention, so rewards stay modest. |
| Harassment during session | Report, remove participant, end session without penalty to the reporter. |

> **Known limitation**  
> Without camera or screen monitoring, no system can prove a student is truly studying. Cahootz accepts this: the mechanic builds social commitment, not proof of work. Camera-on is optional, consent-based and not required for rewards.


### Group sessions (Release 2)

- 2 to 5 members; creator can remove members; quorum is two.
- Pings can target one member or “all”; response windows apply individually.
- Group goal plus individual goals; summary lists attendance (excused shown neutrally).

Technical feasibility: the realtime load per session is tiny (heartbeats and rare events). A single Node instance can hold thousands of such connections. The hard parts are correct state transitions and reconnection, not throughput. **[PROPOSED]**


## 08. Academic data and curriculum architecture

_Extensible model for institutions, programmes and courses_


### Principles

- **Do not assume uniform structure.** Some institutions have faculties and departments; others use schools, colleges or programmes. Some use sessions and semesters; others use trimesters or modules. **[PROPOSED]**
- **Separate catalogue from enrolment.** A course exists once; a student enrolls in an offering for a session and semester.
- **Separate official from community data.** Every record has a provenance and verification status.
- **Country-agnostic by design.** Country-specific levels and calendars are data, not code.


### Core hierarchy

| Entity | Description | Notes |
|---|---|---|
| country | ISO country, default timezone, language | Drives defaults only |
| institution | University or college; aliases; type; verification config | Unique per country; aliases table for names like LAUTECH |
| campus | Physical location (optional) | Nullable |
| org_unit | Generic tree node: faculty, school, college, department, centre | Self-referencing `parent_id` with a `unit_type`, so structures can vary |
| programme | Degree programme under an org_unit, with degree type | B.Sc., B.Eng., MBBS, etc. |
| level_scheme | Per-institution list of levels (100–500, Year 1–5) | Data, not enum |
| academic_session / term | Calendar periods; flexible term type | Semester, trimester, quarter |
| course | Catalogue entry: code, title, credit units, description | Unique on (institution, code) |
| course_offering | Course in a given term, with level and programme links | Carry-overs handled by enrolment, not duplication |
| syllabus / objective | Official outline and learning objectives | Versioned |
| student_enrolment | User's membership of a programme and offerings | Self-declared until verified |

This design uses a generic organizational unit tree instead of hard-coded faculty and department tables. The ER summary in Chapter 17 uses simplified names for readability; the final schema should adopt the generic tree. **[PROPOSED]**


### Collecting, verifying and maintaining data

| Source | Quality | Process |
|---|---|---|
| Official institution lists and handbooks | High | Admin imports with review; versioned |
| Institution partner (future) | High | API or file feed; contract |
| Student-contributed requests | Low until reviewed | Request queue; two independent confirmations or admin approval |
| Scraped public data | Variable | Only with legal review of terms; not planned for MVP |

- Every record has `source`, `verified_by`, `verified_at` and `status` (official, community, unverified).
- Annual refresh cycle per institution at the start of each session; stale-data alerts.
- Merge tool for duplicate courses and aliases; history preserved.

> **Open decisions**  
> Pilot institution and its structure (OPEN-01). How to source initial course catalogues, since manual entry for even one institution is real effort (OPEN-04). Whether to seek an institutional partnership before launch (OPEN-05).


## 09. AI and learning intelligence

_RAG, privacy, cost and evaluation_

AI is an integrated tool, not the identity of Cahootz **[CONFIRMED]**. It is a Release 2 feature **[PROPOSED]**, so this chapter defines the target design and the controls needed before launch.

![Figure 5. Retrieval-augmented generation pipeline with access filtering](CAHOOTZ/images/d08_rag.png)

*Figure 5. Retrieval-augmented generation pipeline with access filtering*


### Architecture components

| Component | Design **[PROPOSED]** | Why |
|---|---|---|
| Model abstraction | Internal `LlmProvider` interface (chat, embed, moderate) with adapters per provider; routing by task and cost tier | Avoid lock-in; allow fallback and price changes |
| Document ingestion | Upload, malware scan, MIME check, text extraction, OCR only when no text layer, language detection | Many Nigerian notes are scans or photos |
| Chunking | Structure-aware chunks (headings, slides) of a few hundred tokens with overlap; metadata: owner, visibility, course, source, version | Retrieval quality and access control |
| Embeddings and vector store | Postgres with pgvector initially, filtered by metadata; dedicated vector DB only when scale or latency requires | One database to operate in early stage |
| Retrieval | Hybrid: keyword plus vector, top-k, rerank, mandatory access filter before ranking | Precision and privacy |
| Citations | Every answer cites chunk ids shown as document, page or slide; “no source found” is a valid answer | Hallucination mitigation and trust |
| Conversation memory | Short rolling window plus optional saved facts the student approves; per-course threads | Control tokens and privacy |
| Cost control | Per-user quotas, caching of embeddings and common answers, small model for simple tasks, max token caps, batch processing for flashcards | AI is a major cost driver |
| Rate limiting | Per user and per IP; separate limits for uploads | Abuse and cost |


### Using the right institution and course context without leakage

- Every chunk carries a **visibility** label: PRIVATE (owner only), COURSE_COMMUNITY (verified members of that course), INSTITUTION_OFFICIAL, PUBLIC.
- Retrieval applies the filter *before* similarity ranking, using the authenticated user's verified enrolments. Failing closed: no filter means no results.
- Private uploads never enter shared indexes and are never used to train models. Provider contracts must state no training on customer data. **[OPEN]**
- Cross-tenant leak tests are release blockers (Chapter 20).


### Institution resources: indexing, verification, updates

Official resources (syllabi, past questions provided with permission) are ingested by admins, labelled OFFICIAL with version and effective session, and re-indexed when replaced. Community resources are labelled COMMUNITY and ranked below official ones. Copyright and licensing for past questions and lecture notes is unresolved and needs legal review. **[OPEN]**


### Safety, quality and evaluation

- **Prompt injection.** Uploaded documents are untrusted data. Prompts separate instructions from retrieved content, strip or neutralize embedded instructions, and the model has no tools that can act on the account. See OWASP LLM Top 10.
- **Hallucination.** Answer only from retrieved sources for course-specific questions; show confidence and sources; allow “report wrong answer”.
- **Academic integrity.** The assistant explains and tutors; it declines to write graded submissions on request. **[PROPOSED]**
- **Evaluation.** A fixed test set per pilot course (questions with expected citations) run on every prompt or model change; track groundedness, citation accuracy, refusal quality and cost per answer.
- **Privacy.** Clear notice of what is sent to providers; data minimization (strip identifiers); retention limits for AI conversations; user deletion.


### Free versus paid **[PROPOSED]**

| Capability | Free | Paid |
|---|---|---|
| Ask course-aware questions with citations | Daily quota | Higher quota |
| Flashcards and quiz generation | Limited monthly | Higher limits |
| Document upload and analysis | Small size and count | Larger and more files |
| Revision schedule | Basic | Personalized |
| Priority and faster models | No | Yes |

Principle: essential academic access, such as official syllabus and community Q&A, never requires payment **[CONFIRMED]**. Only usage-heavy AI conveniences are candidates for payment. **[PROPOSED]**


## 10. Social and communication architecture

_Messaging, presence, notifications and media_


### Technology introduction plan

| Technology | Why needed | When **[PROPOSED]** | Trade-off |
|---|---|---|---|
| HTTPS REST | Most operations are request/response | MVP | Simple and cacheable; not push |
| WebSocket via Socket.IO | Session state, presence, chat delivery, typing | MVP | Needs sticky sessions or adapter at scale; reconnection built in |
| Redis pub/sub and TTL keys | Fan-out across nodes; presence expiry | MVP | Another component to run; not durable |
| Web push and email | Reach offline users | MVP | Push support varies by browser and OS |
| Message persistence in PostgreSQL | Durable chat history | MVP | Table growth; plan partitioning later |
| Object storage + CDN | Attachments and avatars | MVP | Scanning needed |
| WebRTC with TURN/STUN | Audio/video study | Release 3 | Bandwidth cost; TURN relay costs money; complexity |
| SFU media server | Group video efficiently | Later, only if group video grows | Significant operations burden; consider managed provider |


### Messaging design

- **Delivery states:** sent (server stored), delivered (client received), read (opt-in). Clients retry with idempotency keys; messages are ordered by server sequence per conversation.
- **Persistence first.** A message is stored before it is broadcast. Broadcast failure never loses a message.
- **Presence and typing indicators** are ephemeral (Redis, TTL) and can be disabled by the user. Read receipts are optional.
- **Group permissions:** owner, admin, member; admins add or remove members; members cannot add strangers.
- **Who can message whom:** students who share a verified course, have an accepted invitation, or share a group. Blocking is symmetric. **[PROPOSED]**
- **Attachments:** allow-listed types, size caps, malware scan, signed URLs, no executable files.
- **Rate limits:** per-user and per-conversation message rate; new-account limits stricter.


### Notification delivery

A notification service receives domain events and applies user preferences, quiet hours and per-channel rules. Channels: in-app (always), web push, email, and SMS only for security events because of cost. Deduplicate and batch low-priority events. Failures retry with backoff and are visible in operations dashboards. **[PROPOSED]**


### Voice and video design (Release 3)

- Only inside accepted sessions or authorized groups. No random matching **[CONFIRMED]**.
- Camera and microphone off by default; explicit browser permission; per-session consent.
- WebRTC peer-to-peer for two participants, with TURN relay fallback. Use a managed provider for TURN and SFU initially rather than self-hosting. **[PROPOSED]**
- No recording by default **[CONFIRMED]**; any future recording requires explicit consent of all participants and a retention policy.
- Adaptive audio-first mode: audio-only or low-resolution video when bandwidth is poor.


### Designing for unstable connectivity

- Light payloads, compressed assets, skeleton loading states and an optional low-data mode.
- Offline-tolerant queueing for non-critical actions; clear banners when disconnected.
- Session logic never trusts a single missed heartbeat (Chapter 07).
- Test on throttled 3G profiles and mid-range Android browsers as a baseline.


## 11. Security, privacy and trust

_Authentication, authorization, data security, privacy, compliance and threat model_

> **Legal caution**  
> This chapter distinguishes legal requirements from recommended practices, but it is not legal advice. Items marked LEGAL REVIEW require a qualified Nigerian data-protection lawyer before launch. **[OPEN]**


### Authentication

| Topic | Recommendation **[PROPOSED]** |
|---|---|
| Password storage | Argon2id with per-user salt (or bcrypt cost as fallback); never log credentials; breached-password check |
| Registration and email | Verify email by one-time link or code; throttle; block disposable domains where appropriate |
| Phone OTP | Optional; account for SIM-swap risk; do not use SMS as the only high-assurance factor |
| Recovery | Time-limited single-use tokens; notify on change; step-up checks for risky recovery |
| MFA | Optional TOTP or passkeys for all; required for staff and admins |
| Sessions | Short-lived access token plus rotating refresh token in secure, HttpOnly, SameSite cookies; device list and revoke; absolute and idle timeouts |
| Brute force | Per-account and per-IP rate limits; progressive delays; alerting |


### Authorization

- Role-based access control for platform roles; **attribute and resource checks** for ownership, institution and group membership on every request (defence against IDOR/BOLA).
- Institution boundary: queries always include the institution scope; consider PostgreSQL row-level security as a second line of defence.
- Administrative separation: moderators, support and super admins have distinct permissions; no shared accounts; time-boxed elevation; all actions audited.
- Deny by default. Central policy layer, not scattered checks.


### Application security

| Risk | Mitigation **[PROPOSED]** |
|---|---|
| Injection (SQL) | Parameterized queries via ORM; no string-built SQL; least-privilege DB user |
| XSS | Context-aware output encoding; sanitize user rich text; strict Content-Security-Policy |
| CSRF | SameSite cookies plus CSRF tokens for cookie-authenticated mutations |
| SSRF | Allow-list outbound fetches (link previews, document import); block internal address ranges |
| IDOR / BOLA / broken access control | Object-level authorization tests for every endpoint; use unguessable ids |
| API abuse | Rate limits by user, IP and token; quotas; bot detection on signup; WAF |
| File uploads | Type allow-list, size caps, content sniffing, malware scan, store outside web root, serve via signed URL with safe headers |
| Dependency vulnerabilities | Lockfiles, automated dependency scanning, update cadence, SBOM |
| Security misconfiguration | Hardened infrastructure templates; secrets never in code; security headers |
| Logging and monitoring failures | Central logs, alerting on auth anomalies, tamper-resistant audit logs |

The control set is organized against the OWASP Top 10, the OWASP API Security Top 10 and the OWASP ASVS as the verification baseline. Target ASVS level for launch is Level 2 for the authentication, access control and file handling areas. **[PROPOSED]**


### Data security

| Topic | Recommendation **[PROPOSED]** |
|---|---|
| Encryption in transit | TLS 1.2+ everywhere, HSTS; internal service links encrypted |
| Encryption at rest | Managed disk and database encryption; object storage encryption; encrypted backups |
| Classification | Public, Internal, Personal, Sensitive Personal, Secret. Verification documents and moderation evidence are Sensitive. |
| Secrets management | Managed secrets store; rotation; no secrets in repos or client bundles |
| Database access | Private network only; no public endpoint; separate roles for app, migrations and read-only analytics |
| Backups and restoration | Automated daily plus point-in-time recovery; quarterly restore test; access-controlled |
| Retention and deletion | Defined per data class (table below); hard-delete jobs; deletion propagates to backups at expiry |
| Audit logging | Append-only record of privileged and sensitive actions with actor, target, time, reason |

| Data class | Retention **[PROPOSED]** |
|---|---|
| Account and profile | Life of account; delete or anonymize within a defined period after deletion request, subject to legal review |
| Verification documents | Delete shortly after decision; keep only the outcome and method |
| Messages | Life of account unless deleted by users; limited retention after account deletion |
| Moderation evidence | Minimum necessary period for appeals and legal obligations |
| Financial ledger | Retain as legally required; never edited, only reversed by new entries |
| AI conversations | Short default retention; user-deletable |
| Operational logs | Short rolling window; personal data minimized |


### Privacy

- **Data minimization.** Collect only what the feature needs. Avoid collecting phone numbers, real names and government IDs unless required.
- **Consent and transparency.** Clear privacy notice; granular consent for optional processing such as analytics and marketing; consent records stored.
- **Profile visibility.** Default to institution-only visibility; user-controlled per field.
- **Private messages.** Not read by staff by default. Access only through a documented report-based or legal process, and the privacy notice must say so. LEGAL REVIEW.
- **Video.** No recording by default **[CONFIRMED]**.
- **AI data handling.** Notices; provider contracts; no training on user content; deletion.
- **User rights.** Self-service export and deletion, correction, objection; response workflow with deadlines. LEGAL REVIEW.
- **Third parties.** Data processing agreements with every provider; track cross-border transfers.


### Compliance: Nigeria and international

| Item | What the research found | Classification |
|---|---|---|
| NDPA 2023 | Principal Nigerian data-protection law; GAID issued by NDPC 20 March 2025 provides implementation detail [[16]](references/REFERENCES.md#ref-16)[[17]](references/REFERENCES.md#ref-17) | Legal requirement |
| GAID effectiveness | Reported to have come into effect 19 September 2025 and to repeal the NDPR 2019 and its framework [[18]](references/REFERENCES.md#ref-18) | Legal requirement; verify with counsel |
| DCPMI registration | Controllers and processors of “major importance” must register with the NDPC; tiers (ultra-high, extra-high, ordinary-high) and annual compliance audit returns are described [[16]](references/REFERENCES.md#ref-16)[[17]](references/REFERENCES.md#ref-17) | Legal requirement if designated; determine tier. LEGAL REVIEW |
| DPO and DPIA | DCPMIs must designate a Data Protection Officer; GAID details when a Data Protection Impact Assessment is mandatory, with attention to children and high-risk processing [[17]](references/REFERENCES.md#ref-17)[[19]](references/REFERENCES.md#ref-19) | Legal requirement; likely relevant to a student platform with young users. LEGAL REVIEW |
| Children and minors | Under-18 students raise special consent and DPIA considerations; see Chapter 12 | LEGAL REVIEW |
| Other jurisdictions | GDPR (EU/UK) and similar laws apply if users in those regions are targeted. Not analyzed in this version. | OPEN |
| Cross-border transfers | AI and cloud providers outside Nigeria require a lawful transfer basis | LEGAL REVIEW |

Recommended practice, not stated law: appoint a privacy lead from day one, keep a record of processing activities, run a DPIA before launching the verification and AI features, and publish a plain-language privacy page. **[PROPOSED]**


### Threat model (STRIDE) **[PROPOSED]**

| Threat actor / vector | Asset | Impact | Likelihood | Mitigation | Residual |
|---|---|---|---|---|---|
| Spoofing: credential stuffing against accounts | Accounts | High | High | Rate limits, breached-password check, MFA option, alerts | Medium |
| Spoofing: fake student claiming a university | Academic graph | Medium | High | Verification tiers, manual review, reports | Medium |
| Tampering: client forges heartbeats or acks | Session integrity, XP | Medium | Medium | Server authority, caps, anomaly detection | Low-Medium |
| Tampering: user edits wallet balance via API | Ledger | High | Low | Server-only writes, append-only ledger, authorization tests | Low |
| Repudiation: moderator denies an action | Trust | Medium | Low | Immutable audit log with actor and reason | Low |
| Information disclosure: IDOR exposes private data | Profiles, messages | High | Medium | Object-level checks, RLS, tests | Low-Medium |
| Information disclosure: AI returns another student's notes | Private uploads | High | Low-Medium | Pre-filter by visibility, leak tests, no shared index for private | Low |
| Denial of service: connection floods on WebSocket gateway | Availability | Medium | Medium | CDN/WAF, per-IP limits, connection caps | Medium |
| Denial of wallet: AI abuse driving cost | Budget | High | Medium | Quotas, rate limits, per-user cost caps, alerts | Low-Medium |
| Elevation: malicious admin or compromised admin | All data | Very high | Low | MFA, separation of duties, time-boxed access, audit | Medium |
| Malicious file upload | Users, servers | High | Medium | Scan, sandbox, signed URLs, type allow-list | Low-Medium |
| Harassment and grooming via messaging or video | Students | Very high | Medium | Contact limits, blocking, reporting, moderation, age safeguards | Medium |


## 12. Content moderation and student safety

_Policies, human review, appeals and age safeguards_

Cahootz must remain an academically safe environment. It must not become an adult-content platform, a dating application or an unrestricted video-chat service. **[CONFIRMED]**


### Policy areas **[PROPOSED]**

| Area | Rule | Typical first action | Severe case |
|---|---|---|---|
| Nudity and sexual content | Not allowed anywhere; avatars and uploads scanned | Remove and warn | Permanent ban; legal report where required |
| Harassment, bullying, threats | Not allowed; targeted repeated contact treated as harassment | Remove, warn, restrict messaging | Ban; escalate credible threats |
| Hate speech | Not allowed | Remove and warn | Ban |
| Scams and spam | No solicitation, fake offers, mass invitations | Remove, rate-limit | Ban, report |
| Impersonation | No pretending to be staff, lecturers or other students | Verification, rename or remove | Ban |
| Inappropriate solicitation (romantic, sexual, payments) | Not allowed; Cahootz is not a dating product | Warn and restrict | Ban |
| Malicious files | Blocked by scanning | Block | Ban |
| Academic misconduct | No exam leaks, ghost-writing, selling assignments | Remove, warn | Escalate to repeated offenders; cooperate with institutions per policy |
| Abuse of rewards | No farming, collusion, multi-accounts | Reverse rewards | Ban |


### Moderation system

- **Automated detection:** keyword and pattern filters, image-safety classifiers, spam heuristics, rate limits. These reduce load but do not guarantee detection. False negatives and false positives both occur and are monitored.
- **User reporting:** reporting available on every message, post, profile and session participant; one tap plus reason.
- **Human moderation:** trained moderators with queues, severity tiers, response targets (for example urgent within hours; to be set by pilot capacity). **[OPEN]**
- **Escalation:** level 1 moderator, level 2 senior moderator, legal and safety lead for threats, self-harm indications and child-safety cases.
- **Sanctions ladder:** warning, content removal, temporary feature restriction (24h to 30 days), temporary suspension, permanent suspension.
- **Appeals:** one appeal per sanction, reviewed by a different moderator; decision reasons recorded.
- **Evidence handling:** snapshot of reported content stored in restricted, access-logged storage with limited retention.
- **Repeat offenders:** strike system with decay; device and verification signals to limit re-registration.


### Video safeguards (Release 3)

- No unrestricted random matching.
- Camera and microphone require explicit permission; camera off by default where appropriate.
- Any participant can remove another, block or report immediately; reports can attach session metadata, not recordings.
- No recording by default; no live human monitoring of private sessions by default, which is a privacy trade-off. Live moderation is limited to community-hosted rooms with moderators present.


### Age assurance and minors

University students are mostly adults, but some may be under 18. **[OPEN]** Recommended: collect date of birth at signup; disallow under-16 accounts in MVP; for 16 to 17, restrict direct messaging with unknown adults, default to the strictest privacy, and require legal review of parental-consent rules before enabling. Age is self-declared at first, which is weak assurance; stronger methods are part of the open decisions. **[PROPOSED]**

> **Secondary schools**  
> Expanding to secondary school students requires a separate child-safety design (parental consent, no open social features, stricter moderation, DPIA) and must not reuse university social features unchanged. **[CONFIRMED]**


## 13. Gamification and virtual economy

_XP, coins, ledger and fraud controls_


### Concepts kept separate **[CONFIRMED]**

| Concept | Purpose | Spendable? | Can decrease? |
|---|---|---|---|
| XP | Measure effort and progress; levels | No | No |
| Coins | Spendable virtual currency (Release 3) | Yes, on cosmetics and perks | Yes, by spending or reversal |
| Achievements | Badges for milestones | No | No |
| Streaks | Consistency indicator | No | Resets or uses a freeze |
| Reliability | Trust signal for partners | No | Yes, with rolling window |
| Rewards | Catalogue items bought with coins or earned | — | — |
| Premium entitlements | Subscription-based access | — | Expire |


### Ledger design **[CONFIRMED]**

All coin and XP changes are append-only ledger entries. Balances are derived or cached from the ledger, never edited directly. For coins, use **double-entry bookkeeping**: each transaction has two or more entries that sum to zero across accounts (user wallet, system rewards pool, system revenue, refunds).

| Table | Key fields |
|---|---|
| wallet_accounts | id, owner (user or system), currency (COIN), type, created_at |
| wallet_transactions | id, type (EARN, SPEND, REVERSAL, GRANT, REFUND, EXPIRY), idempotency_key (unique), reason_code, reference (session id, order id), created_at |
| wallet_entries | id, transaction_id, account_id, amount (signed integer), balance_after (optional snapshot) |
| xp_ledger | id, user_id, amount, reason_code, reference, created_at |

- Amounts are integers; no floating point.
- Transaction creation runs in one database transaction with row locking or serializable isolation on the affected wallet.
- Idempotency keys prevent double-awarding if a request is retried.
- Reversals are new entries that reference the original; originals are never altered or deleted.


### Earning, spending, limits **[PROPOSED]**

| Topic | Proposed rule |
|---|---|
| Earn XP | Completed sessions (scaled by duration), streak days, helpful answers accepted; daily cap |
| Earn coins (R3) | Small amounts for completed sessions and weekly goals; daily and weekly caps; no coins from idle time |
| Spend coins | Cosmetics, streak freezes, profile customization; not required for any academic access **[CONFIRMED]** |
| Balance | Sum of ledger entries for the account |
| Reversal | If a session is later found fraudulent or a dispute is upheld, a reversal entry removes the reward; balance may go to zero but not negative; repeat offenders sanctioned |
| Expiry | Avoid expiry initially; if introduced for liability reasons, needs legal review and clear notice |
| Transferability | Not transferable and not withdrawable as cash **[CONFIRMED]** |
| Refunds | Purchases refundable per provider rules and consumer-protection law; refund creates reversing entries |


### Fraud and abuse prevention

- Verified academic identity and device/IP signals to limit multi-accounting.
- Per-pair and per-day session reward limits; unusual earning patterns flagged.
- Rewarded-ads: server-side verification callbacks, frequency caps; no rewarded ads for under-18 users until legal review.
- Anomaly dashboards and manual wallet freezes for review, always logged.


### Legal, financial and operational implications of paid virtual currency **[OPEN]**

If coins can be bought with real money, Cahootz takes on payment processing, tax, consumer-protection, refund, chargeback and possibly financial-regulatory questions in Nigeria. This version does not assert what the law requires. The safe design choices are: keep coins non-transferable and non-cashable, treat them as in-app licenses, avoid anything resembling stored value or gambling, and obtain advice from a Nigerian fintech and consumer-protection lawyer before Release 3. LEGAL REVIEW.

> **Recommendation**  
> Do not ship paid coins in the MVP. Prove the study loop with XP and streaks first. Add coins only after legal review and clear evidence that students want them. **[PROPOSED]**


## 14. Business model and monetization

_Revenue streams and costs without invented projections_

| Revenue stream | Fit | Trust risk | Stage **[PROPOSED]** |
|---|---|---|---|
| Freemium core | Excellent: keeps access open | Low | MVP |
| Premium subscription (AI limits, advanced analytics, cosmetics) | Good, similar to Knowt and Quizlet paid tiers [[12]](references/REFERENCES.md#ref-12) | Low if free core is generous | Release 2-3 |
| AI usage tiers | Good, ties price to real cost | Low-medium | Release 2 |
| Institutional partnerships | Strong long-term: verified rosters, official content, analytics | Medium if data use unclear | Release 3+ |
| Educational partnerships (publishers, tutors) | Moderate | Medium | Later |
| Sponsored academic content | Possible, clearly labeled | Medium-high | Later, careful |
| Rewarded advertisements | Weak fit for focus; can distract and raise child-safety issues | High | Avoid until proven; legal review |
| Paid virtual currency | Uncertain; legal complexity | High | Not before Release 3 and legal review |


### Staged strategy **[PROPOSED]**

1. **Stage 0 (MVP, pilot):** No revenue. Validate retention and session completion. Keep costs low.
2. **Stage 1:** Optional supporter subscription and basic premium; AI free tier funded by quota.
3. **Stage 2:** Institutional pilots and partnerships.
4. **Stage 3:** Cosmetic coin economy if validated; sponsored content labeled and academic only.


### Main operating costs **[PROPOSED]**

| Cost driver | Why it matters | Control |
|---|---|---|
| AI inference and embeddings | Scales with usage; unpredictable | Quotas, caching, small models, usage-based tiers |
| Realtime infrastructure | Concurrent connections and Redis | Efficient protocol, regional hosting, autoscale only when needed |
| Video/TURN | Bandwidth is expensive | Delay to Release 3; audio-first; managed provider with caps |
| Storage and egress | Documents and attachments | R2 or equivalent with low egress; lifecycle rules; size limits |
| Moderation | Human time is the largest recurring safety cost | Automation for triage, volunteer moderators with training, per-community moderation |
| Support and verification | Manual review time | Clear flows, self-service, partner rosters |

> **No revenue projections**  
> This version contains no revenue forecast because no verified willingness-to-pay, conversion rates or pricing for Nigerian students exist yet. A model will be built from stated assumptions after pilot data. **[OPEN]**


## 15. UX/UI and brand direction

_Principles, IA, design system and wireframes_


### Design philosophy **[PROPOSED]**

Modern, premium, youthful without being childish, friendly, academic without feeling institutional, social without becoming distracting, consistent across desktop, tablet and mobile. The Study Together screen is deliberately calm: few elements, large timer, clear state.


### Information architecture

| Section | Contents | Primary action |
|---|---|---|
| Home / Dashboard | Today's plan, streak, upcoming sessions, suggested partners, community highlights | Start or join session |
| Discover | Students and rooms filtered by course and availability | Invite |
| Study | Active session, schedule, history, goals | Start session |
| Communities | Institution and course spaces, Q&A | Ask or answer |
| AI Study (R2) | Course-aware assistant, flashcards, quizzes | Ask |
| Messages | Conversations and groups | Reply |
| Wallet (R3) | Balance, history, rewards | Spend |
| Profile | Public profile, reliability, achievements | Edit |
| Settings | Privacy, notifications, sessions, data rights | — |
| Admin (staff) | Queues, tools, audit | — |

Navigation: bottom tab bar on mobile (Home, Discover, Study, Communities, Messages), left rail on desktop, with Profile and Settings in a menu. Maximum two taps from Home to start a session. **[PROPOSED]**


### Design system **[PROPOSED]**

| Element | Specification |
|---|---|
| Typography | Display: Poppins (semi-bold) for headings; Body: Inter or a comparable humanist sans at 16px base; tabular numerals for timers |
| Colour | Deep navy #0B1B3A (brand base), blue #2F6BFF (action), off-white #F7F6F2 (surface), semantic green #2E9E6B, amber #C98410, red #C0392B. Dark mode planned. |
| Spacing | 4px base scale: 4, 8, 12, 16, 24, 32, 48 |
| Grid | 4 columns mobile, 8 tablet, 12 desktop; max content width 1200px |
| Breakpoints | 360, 640, 1024, 1280 px |
| Buttons | Primary (filled), secondary (outline), ghost, destructive; 44px minimum touch target |
| Cards | Rounded 12px, subtle border, minimal shadow |
| Forms | Inline validation, clear error text, labels always visible |
| Modals | Used sparingly; accessible focus trap; escape to close |
| Notifications | Toast for transient; inbox for persistent |
| Empty / loading / error states | Always designed: explain what is missing and offer a next step; skeletons not spinners; retry actions |
| Accessibility | WCAG 2.2 AA target: contrast, keyboard operation, focus states, screen-reader labels, reduced-motion, text scaling |


### Wireframe descriptions

| Screen | Layout description **[PROPOSED]** |
|---|---|
| Dashboard | Top: greeting and streak chip. Middle: large card “Next session” with countdown and Start button. Below: “Suggested partners” horizontal list; “Your courses” communities; “This week” bar chart of study minutes. |
| Discover | Search and filter chips (course, level, time). Vertical list of partner cards (avatar, first name, course overlap, reliability band, availability chips, Invite button). “Looking now” toggle at top. |
| Study Together (active) | Centered large timer; below, partner avatars with presence dots; goals row; Ping button; Break and Leave in a secondary area; a quiet activity log at bottom. |
| Session lobby | Both participants listed with ready state; configuration summary; Start enabled when all ready. |
| Community | Course header, tabs (Q&A, Resources, Announcements, Members), ask button; question cards show accepted-answer badge. |
| AI Study (R2) | Course selector, chat thread, source chips under each answer, side panel for generated flashcards. |
| Wallet (R3) | Balance, recent transactions list, reward grid, clear “coins have no cash value” notice. |
| Settings | Grouped lists: Privacy, Notifications, Devices, Data and account. |

Brand name, logo and domain are not finalized **[OPEN]**. The colours here reflect the brief's suggested direction and the cover of this document.


## 16. Technical system architecture

_Modular monolith, stack evaluation, domains and diagrams_


### Modular monolith versus microservices

Recommendation: **a modular monolith**, matching the founder's preference to avoid premature microservices. **[CONFIRMED]** One deployable backend with strict internal module boundaries, separate database schemas per domain where useful, and in-process events, extracted into services only when a signal demands it.

| Factor | Modular monolith | Microservices |
|---|---|---|
| Team size | Fits 1 to 8 engineers | Needs platform expertise |
| Operations | One service to deploy and monitor | Many services, tracing, service discovery |
| Transactions | Simple ACID across modules | Distributed consistency problems |
| Speed of change | Fast early on | Slower coordination |
| Scaling | Scale whole app or split hot spots | Independent scaling |
| Risk | Boundary erosion without discipline | Premature complexity |

Mitigation for boundary erosion: modules expose only service interfaces; no cross-module database access; lint rules enforce imports; domain events for cross-module reactions. Candidates for early extraction if signals appear: realtime gateway, media, AI workers. **[PROPOSED]**


### Technology evaluation **[PROPOSED]**

| Layer | Initial direction (from brief) | Assessment |
|---|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind | Strong ecosystem and hiring pool; server rendering helps first load on slow networks. Keep client bundles small. |
| Backend | Node.js with NestJS | NestJS gives modules, dependency injection and structure suited to a modular monolith. Alternatives (Fastify with a custom structure) are lighter but need more discipline. |
| Database | PostgreSQL | Right default: relational integrity, transactions, JSON, full-text, pgvector. |
| ORM | Prisma or Drizzle | Prisma: mature, productive, migration tooling. Drizzle: SQL-close, lighter, good for complex queries. Recommend deciding by a small spike (OPEN-08). |
| Realtime | WebSockets / Socket.IO | Socket.IO adds reconnection and fallbacks, useful on poor networks. Redis adapter for scale. |
| Cache and presence | Redis | Presence TTL, pub/sub, rate limits, queues (BullMQ). |
| Storage | Cloudflare R2 or equivalent | S3-compatible, low egress cost; verify regional performance for Nigeria. |
| AI | Provider abstraction, retrieval, vector search | Start with pgvector. Revisit at scale. |
| Deployment | Scalable cloud | Start managed (containers, managed Postgres and Redis). Region choice affects latency for Nigerian users; evaluate Europe or Africa regions (OPEN-09). |


### Domain boundaries

| Domain | Owns | Does not own |
|---|---|---|
| Identity | Accounts, credentials, sessions, MFA, roles | Academic data |
| Institutions | Institutions, org units, programmes, courses, verification config | Student activity |
| Students | Profiles, preferences, availability, enrolments | Sessions |
| Discovery | Search, match scoring, invitations | Session execution |
| Study sessions | State machine, timers, signals, streaks, reliability | Chat |
| Academic communities | Communities, posts, Q&A, resources metadata | Moderation decisions |
| Messaging | Conversations, messages, receipts | Notifications delivery |
| AI | Ingestion, retrieval, assistant, quotas | Raw file storage |
| Wallet | Ledgers, rewards, purchases | Gamification rules |
| Moderation | Reports, actions, appeals, evidence | Content storage |
| Notifications | Preferences, templates, delivery | Event creation |
| Administration | Staff UI, feature flags, audit viewing | Business rules |


### System context and container architecture

![Figure 6. System context diagram](CAHOOTZ/images/d01_context.png)

*Figure 6. System context diagram*

![Figure 7. Container architecture diagram](CAHOOTZ/images/d02_containers.png)

*Figure 7. Container architecture diagram*


### Component and data flow

Inside the backend each domain is a Nest module with a controller layer (HTTP and WebSocket gateways), application services, domain logic and repositories. Requests flow: client, API gateway layer (auth, rate limit), controller, service, repository, PostgreSQL; side effects publish domain events consumed by workers (notifications, XP, analytics). Realtime commands flow through the gateway to the Study sessions service, the single writer of session state.

![Figure 8. Realtime event architecture for Study Together](CAHOOTZ/images/d05_realtime.png)

*Figure 8. Realtime event architecture for Study Together*


### Deployment architecture

![Figure 9. Initial deployment architecture](CAHOOTZ/images/d06_deploy.png)

*Figure 9. Initial deployment architecture*

All environments (development, staging, production) use infrastructure as code. Staging mirrors production on a smaller scale. Secrets live in a managed secrets store. Continuous integration runs tests and scans on every pull request; deployments are automated with rollback. **[PROPOSED]**


## 17. Database architecture

_Candidate PostgreSQL schema and concurrency rules_

Candidate schema for PostgreSQL. It is a design baseline, not final SQL. Entities in the brief are covered; names follow the brief with the academic tree generalized as noted in Chapter 08. **[PROPOSED]**

![Figure 10. Entity relationship summary: academic and Study Together domains](CAHOOTZ/images/d04_er.png)

*Figure 10. Entity relationship summary: academic and Study Together domains*

![Figure 11. Entity relationship summary: community, messaging, economy and trust](CAHOOTZ/images/d04b_er.png)

*Figure 11. Entity relationship summary: community, messaging, economy and trust*


### Core entities and constraints

| Entity group | Key tables | Primary / unique / foreign keys |
|---|---|---|
| Identity | users, user_profiles, auth_sessions, roles, user_roles | PK uuid; unique lower(email), unique phone; profile FK users(id) unique; user_roles unique (user_id, role, scope) |
| Academic | institutions, campuses, org_units, programmes, academic_levels, academic_sessions, semesters, courses, course_offerings, student_enrolments | courses unique (institution_id, code); offerings unique (course_id, term_id); enrolments unique (user_id, offering_id) |
| Preferences | study_preferences, study_availability | FK user; availability uses weekday, start, end, timezone |
| Study Together | study_invitations, study_sessions, study_participants, accountability_signals, session_events, study_streaks, reliability_records | participants unique (session_id, user_id); signals FK session and sender, with deadline; session_events append-only with (session_id, seq) unique |
| Community | communities, community_members, discussions, comments | members unique (community_id, user_id); discussions FK community; soft delete |
| Messaging | conversations, conversation_members, messages | messages unique (conversation_id, seq); client message id unique per sender for idempotency |
| Notifications | notifications, notification_preferences | index (user_id, read_at, created_at) |
| Resources and AI | academic_resources, documents, document_chunks, ai_conversations, ai_messages | chunks FK document; vector column with metadata; visibility enum |
| Economy | xp_ledger, wallet_accounts, wallet_transactions, wallet_entries, rewards | entries FK transaction; transaction idempotency_key unique; check constraints |
| Trust | reports, moderation_actions, audit_logs | reports FK reporter and target polymorphic; audit_logs append-only |


### Indexing and query optimization

- Composite indexes matching query shapes, for example (institution_id, course_id, availability_slot) for discovery.
- Partial indexes for active records (status = ACTIVE sessions, unread notifications).
- Full-text indexes for course and community search; trigram for fuzzy names.
- Keyset (cursor) pagination for feeds and messages; avoid deep OFFSET.
- Review slow queries with `EXPLAIN ANALYZE` from the first load test.


### Transactions and concurrency

| Area | Control **[PROPOSED]** |
|---|---|
| Session state changes | Single writer per session; optimistic version column; each transition in one transaction with its event row; unique (session_id, seq) |
| Reward on completion | One transaction: update session, insert XP ledger and streak updates; idempotency key = session id + user id |
| Wallet | Serializable or row-level lock on wallet account; check constraint prevents negative balance; ledger append-only |
| Invitations | Unique pending invitation per (sender, recipient, course); expiry job |
| Messages | Sequence per conversation allocated in-transaction; client id dedupes retries |


### Soft deletion, retention, boundaries and audit

- Soft delete (deleted_at) for user content so moderation and appeals work; scheduled hard delete per retention table (Chapter 11).
- Institution boundary: institution_id on tenant-scoped tables; app-level scoping plus PostgreSQL row-level security as defence in depth.
- Audit: append-only audit_logs; database role used by the app cannot update or delete them.
- Money and ledgers: never updated or deleted; reversals are new rows.
- Partitioning of messages, session_events and notifications by time when volume warrants.


## 18. API and realtime specifications

_Conventions, endpoints and realtime events_


### Conventions **[PROPOSED]**

| Topic | Rule |
|---|---|
| Style and versioning | REST over HTTPS, JSON, base path `/api/v1` |
| Authentication | Cookie-based session or bearer access token; all endpoints require auth unless marked public |
| Authorization | Role plus resource checks; 403 on denial; 404 to hide existence of private objects |
| Validation | Schema validation on every request; unknown fields rejected; max sizes |
| Errors | JSON: `{ "error": { "code", "message", "details", "requestId" } }`; codes include VALIDATION_FAILED, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INVALID_STATE |
| Pagination | Cursor-based: `?limit=25&cursor=...`, response `{ items, nextCursor }` |
| Idempotency | `Idempotency-Key` header required on POSTs that create sessions, payments, wallet changes |
| Rate limiting | Headers X-RateLimit-Limit/Remaining/Reset; 429 with Retry-After |


### Representative endpoints

| Area | Method and path | Auth | Request (key fields) | Response / notes |
|---|---|---|---|---|
| Auth | POST /auth/register | Public | email, password, dob | 201 user id; verification sent; rate-limited |
| Auth | POST /auth/login | Public | email, password | 200 session; MFA challenge if enabled |
| Auth | POST /auth/password/reset | Public | email | 202 always (no account enumeration) |
| Onboarding | PUT /me/academic-profile | Student | institutionId, orgUnitId, programmeId, levelId, termId, courseIds[] | 200 profile; 422 if invalid combination |
| Institutions | GET /institutions?query= | Student | query, countryCode | List; cursor |
| Institutions | POST /institution-requests | Student | name, country, evidence | 202 queued |
| Discovery | GET /discover/students | Verified | courseId, level, availability, goal, cursor | Items with match reasons; no emails; blocked users excluded |
| Invitations | POST /study-invitations | Verified | recipientId, courseId, proposedStart, durationMin, message | 201; 429 if limit; 403 if blocked |
| Invitations | POST /study-invitations/{id}/accept | Recipient | — | 200 creates or advances session |
| Sessions | POST /study-sessions | Verified | participantIds[], durationMin, cycle, pingPolicy, responseWindowSec, goal | 201 CREATED; idempotent |
| Sessions | POST /study-sessions/{id}/start | Participant | — | 200 ACTIVE; 409 INVALID_STATE |
| Sessions | GET /study-sessions/{id} | Participant | — | Snapshot with server time, seq, endsAt |
| Signals | POST /study-sessions/{id}/signals | Participant | targetUserId? | 201 signal with deadline |
| Signals | POST /study-sessions/{id}/signals/{sid}/ack | Recipient | — | 200 responded; idempotent |
| Communities | GET /communities/{id}/discussions | Member | tag, cursor | List |
| Communities | POST /communities/{id}/discussions | Member | title, body, tags | 201; moderation hooks |
| Messaging | POST /conversations/{id}/messages | Member | clientMessageId, body, attachmentIds | 201 with seq |
| AI (R2) | POST /ai/conversations/{id}/messages | Student | courseId, content, documentIds[] | 200 answer, citations[]; 429 on quota |
| Wallet (R3) | GET /wallet | Student | — | Balance and recent entries |
| Wallet (R3) | POST /rewards/{id}/redeem | Student | — | 201 transaction; idempotent |
| Reporting | POST /reports | Student | targetType, targetId, reason, note | 201 receipt |
| Blocking | POST /blocks | Student | userId | 201; cancels shared sessions |
| Admin | POST /admin/users/{id}/restrictions | Moderator | type, until, reasonCode | 201 audited |
| Admin | GET /admin/audit-logs | Super admin | filters | List; read-only |


### Realtime events

Namespace `/realtime`. Clients authenticate during the handshake. Events are small JSON with `seq` and `sessionId`. Commands that change money, membership or academic data are never done only over realtime. They stay in synchronous HTTP APIs. **[PROPOSED]**

| Event | Direction | Payload (key fields) | Purpose |
|---|---|---|---|
| session.join | client to server | sessionId, lastSeq | Join room; server replies with snapshot |
| session.snapshot | server to client | state, startedAt, endsAt, serverNow, participants[], seq | Initial sync |
| presence.heartbeat | client to server | sessionId, visibility | Presence TTL refresh |
| presence.changed | server to client | userId, status | PRESENT, AWAY_UNREACHABLE, OFFLINE_EXCUSED |
| session.state | server to client | state, reason, seq | State transitions |
| signal.sent | server to client | signalId, from, deadlineAt | Show ping prompt |
| signal.ack | client to server | signalId | Acknowledge |
| signal.resolved | server to client | signalId, result (responded, unreachable, missed) | Outcome |
| break.requested / break.agreed | both | durationSec | Break flow |
| chat.message | both | conversationId, clientMessageId, body | Realtime chat; persisted first |
| notification.new | server to client | id, type, title | In-app notice |

Synchronous operations: account, profile, invitation, wallet, reports, uploads. Asynchronous: notifications, rewards after completion, AI ingestion, moderation scans, analytics. **[PROPOSED]**


## 19. Scalability and performance

_Growth scenarios with explicit assumptions_

> **Honest framing**  
> User counts alone do not determine capacity. Load depends on concurrency, session duration, message rate, AI usage and media. The figures below are planning assumptions, not measurements, and must be replaced by data from load tests and the pilot. **[OPEN]**


### Assumptions **[PROPOSED]**

- Peak concurrent users about 10 to 20 percent of daily active users (evenings and exam periods).
- About 30 percent of concurrent users in a Study Together session; each connection sends a heartbeat every 15 to 30 seconds.
- Chat: a few messages per active user per hour.
- AI requests: Release 2 only; a small fraction of active users per day.

| Scenario (active users) | Likely peak concurrent | Realtime load | Recommended setup | Change signals |
|---|---|---|---|---|
| 100 initial users | 10 to 20 | Trivial | 1 app container, managed Postgres, managed Redis | None; focus on learning |
| 1,000 active | 100 to 200 | Hundreds of sockets | 2 API/realtime instances behind LB, 1 worker, connection pooling | p95 API latency over 400 ms; CPU over 60% sustained |
| 10,000 active | 1,000 to 2,000 | Thousands of sockets; heartbeat 100 to 200 per second | 3 to 6 app instances, Redis adapter, read replica, CDN tuning, queue workers | DB CPU or connections high; replica lag; Redis memory |
| 100,000 active | 10,000 to 20,000 | Tens of thousands of sockets | Split realtime gateway from API, replicas, partitioned tables, dedicated search and vector store if needed, regional failover | Per-service saturation; cost per active user |
| International growth | Region-dependent | Multi-region latency | Region-aware deployment, data residency review, localized CDN | Latency by region; legal requirements |


### Techniques

| Topic | Approach **[PROPOSED]** |
|---|---|
| Horizontal scaling | Stateless app containers; sticky sessions or Redis adapter for sockets |
| Connection pooling | PgBouncer or built-in pooler; cap connections per instance |
| Caching | Redis for hot reads (course catalogues, profile cards); HTTP caching and CDN for static assets; cache invalidation by domain events |
| Background jobs and queues | BullMQ or equivalent; retries with backoff; dead-letter queue; scheduled deadline jobs |
| WebSocket scaling | Socket.IO Redis adapter; connection limits; graceful shutdown with drain |
| Read replicas | For analytics and heavy reads; accept replication lag |
| CDN and object storage | CDN for assets; R2 for files; signed URLs |
| Observability | Structured logs, metrics (latency, errors, sockets, queue depth), tracing, uptime checks, alerting with on-call ownership |
| Backups and disaster recovery | Automated backups, point-in-time recovery, restore drills; define RPO and RTO targets (OPEN-10) |
| Graceful degradation | Disable AI and non-critical features first; keep sessions and chat alive; maintenance banner; feature flags as kill switches |
| Cost management | Budgets and alerts per service; AI cost per active user; right-size instances; evaluate region and egress |

Initial deployment recommendation: the Stage 1 layout in Figure 9. Start single-region near the main user base, with managed services to reduce operations load. Pick a region after measuring latency from Nigerian networks. **[OPEN]**


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


## 21. Administration and operations

_Internal tools, roles and permissions_

| Area | Capabilities | Roles **[PROPOSED]** |
|---|---|---|
| User management | Search, view status, restrict, force logout, export or delete requests | Support (limited), Platform admin |
| Institution and academic data | Create and merge institutions, org units, courses; import | Platform admin, Institution admin (own) |
| Verification queue | Review documents with masked data; approve or reject with reason; auto-delete documents | Verification reviewer |
| Community moderation | Queue, bulk actions, community rules | Moderators |
| Reports and appeals | Triage, evidence, sanctions ladder | Moderator, Senior moderator |
| Content management | Official resources, announcements, help content | Content admin |
| Wallet and rewards oversight | View ledger, freeze wallets, issue compensating entries by dual approval | Finance admin (R3) |
| Advertising management | Campaign review and labelling | Ads admin (later) |
| Analytics | Aggregated dashboards; no raw private content | Analyst, Platform admin |
| Audit trails | Searchable audit log; export | Super admin, Compliance |
| System health | Dashboards for errors, queues, sockets, costs | Engineers |
| Feature flags | Create, target and roll out flags; kill switches | Platform admin, Engineers |
| Support operations | Ticket handling, session-dispute intake, macros | Support |

Principles: least privilege; separate staff accounts with mandatory MFA; sensitive actions require a reason; dual approval for money-related corrections; staff access to user data is logged and reviewed monthly; no direct production database access for non-engineers. **[PROPOSED]**


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


## 23. Product metrics and success measurement

_North Star and metric definitions_


### North Star Metric **[PROPOSED]**

**Weekly Completed Study Sessions per Active Student** (a completed session with at least 25 active minutes, with a partner). It captures the core loop (partner, commitment, completion) and the habit (weekly). A weakness: it could be gamed by easy sessions, so it is read with partner retention and report rate. **[PROPOSED]**

| Metric | Definition **[PROPOSED]** | Type |
|---|---|---|
| Registration completion | Registered users completing onboarding | Funnel |
| Verification completion | Onboarded users verified | Funnel |
| First partner discovery | Verified users sending or receiving an invite within 7 days | Activation |
| First study session | Users completing first session within 14 days | Activation |
| Session completion rate | Completed / started sessions | Quality |
| Sessions per active student | Completed sessions per weekly active | Engagement |
| Partner retention | Pairs completing at least 2 sessions | Retention |
| 7-day and 30-day retention | Users returning on day 7 and 30 | Retention |
| Community participation | Share of active users posting or answering | Engagement |
| AI engagement | Weekly AI users and cited-answer rate | Engagement (R2) |
| Moderation incidents | Reports per 1,000 sessions and time to action | Safety |
| Acquisition cost | Spend / new activated users | Business |
| Revenue per active user and subscription conversion | Revenue / active; paid / active | Business |

**Vanity metrics** such as raw registrations, downloads, total messages or total XP awarded show activity, not value. Genuine value signals: repeat partnerships, completed sessions per student, retention and improved self-reported study consistency. Course outcomes (grades) are valuable but hard to attribute and require consent and care. **[PROPOSED]**


## 24. Risk register and open decisions

_Risks, assumptions and open questions_


### Risk register

Scale: Likelihood and Impact are Low, Medium, High, Very high. Priority combines both. Status is Open for all risks in this baseline version. **[PROPOSED]**

| ID | Category | Risk | Like. | Impact | Priority | Mitigation | Owner | Status |
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


### Assumption and verified-fact register

| ID | Statement | Status | How to validate |
|---|---|---|---|
| A-01 | Nigerian university students want a social accountability tool for studying | Unvalidated | Student interviews and pilot |
| A-02 | Students will complete academic verification | Unvalidated | Pilot funnel |
| A-03 | Many students lack institutional email | Unvalidated | Survey at pilot campus |
| A-04 | Web access via mobile browsers is dominant | Unvalidated | Analytics and surveys |
| A-05 | Presence heartbeats are sufficient evidence of engagement for rewards | Unvalidated | Pilot and abuse monitoring |
| A-06 | Peak concurrency is 10 to 20 percent of active users | Unvalidated | Load tests, pilot telemetry |
| A-07 | NDPA and GAID apply and likely classify Cahootz as a controller; DCPMI status undetermined | Partly verified (law exists); classification unverified | Legal review |
| A-08 | GAID in force since 19 September 2025 | Reported by secondary sources [[18]](references/REFERENCES.md#ref-18); confirm with NDPC | Legal review |
| V-01 | Forest offers synchronized shared-stake group focus | Verified from official page [[7]](references/REFERENCES.md#ref-7) | — |
| V-02 | Focusmate offers 25/50/75 minute one-to-one sessions | Verified from official FAQ [[1]](references/REFERENCES.md#ref-1) | — |
| V-03 | NDPC issued GAID on 20 March 2025 | Verified from official PDF and law-firm sources [[16]](references/REFERENCES.md#ref-16)[[17]](references/REFERENCES.md#ref-17) | — |

IDs beginning A are assumptions needing validation. IDs beginning V are verified facts from the research sources cited.


### Open decisions requiring attention **[OPEN]**

| ID | Question | Decision owner | Priority |
|---|---|---|---|
| OPEN-01 | Which pilot institution(s) and what is their academic structure? | Founder | Critical |
| OPEN-02 | Which verification methods at launch; what can unverified users do? | Founder | Critical |
| OPEN-03 | Is the name Cahootz available (trademark, company name, domain)? | Founder | High |
| OPEN-04 | How will the first course catalogues be sourced and maintained? | Founder + Product | High |
| OPEN-05 | Pursue institutional partnership before launch or after? | Founder | Medium |
| OPEN-06 | Minimum age and treatment of 16 to 17 year olds | Founder + counsel | Critical |
| OPEN-07 | DCPMI classification, DPO and DPIA obligations under NDPA/GAID | Counsel | Critical |
| OPEN-08 | Prisma or Drizzle (technical spike) | Tech lead | Medium |
| OPEN-09 | Cloud region and provider selection after latency tests | DevOps | High |
| OPEN-10 | Recovery targets (RPO, RTO) and budget | Founder + Tech lead | Medium |
| OPEN-11 | Study Together default numbers (windows, grace, thresholds) | Product | High |
| OPEN-12 | Moderation staffing model for pilot | Founder | High |
| OPEN-13 | Legal status and design of coins before Release 3 | Counsel | High |
| OPEN-14 | Market size, willingness to pay, pricing | Researcher | Medium |
| OPEN-15 | Copyright approach to past questions and lecture notes | Counsel | High |
| OPEN-16 | Scope of Studaily and Studyverse research (could not verify) | Researcher | Low |

> **Founder approval needed**  
> OPEN-01, 02, 03, 06 and 07 block detailed planning and should be decided first. Items marked Counsel require qualified legal advice, not a product decision.


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


## Appendix A: Master project tracker

_Initial backlog; no task falsely marked complete_

Initial backlog. **Nothing is marked Done or In Progress** because no work has been verified as started. Status values: Not Started, In Progress, Review, Blocked, Done. Priority: Critical, High, Medium, Low. Update this table in the repository file PROJECT_TRACKER.md as the source of truth. **[PROPOSED]**

| ID | Workstream / owner | Task and description | Priority | Status | Depends on | Acceptance criteria / notes |
|---|---|---|---|---|---|---|
| T-001 | Governance   Founder | **Founder approval of blueprint v0.1**   Review all PROPOSED items; approve or amend | Critical | Not Started | — | Decision log updated; status changes recorded   *Starts project* |
| T-002 | Legal   Founder | **Engage Nigerian data-protection counsel**   NDPA, GAID, DCPMI, DPIA, minors | Critical | Not Started | — | Written advice on OPEN-06, 07   *Budget needed* |
| T-003 | Research   Researcher | **Student interviews at pilot campus**   15 to 20 interviews on study habits and partner needs | High | Not Started | OPEN-01 | Findings summary; A-01 updated |
| T-004 | Branding   Founder | **Name, trademark and domain checks**   Availability and conflicts | High | Not Started | — | Report; decision logged   *OPEN-03* |
| T-005 | Product   Product | **Finalize MVP requirements and acceptance criteria**   Detail stories per MVP module | High | Not Started | T-001 | Stories with criteria in tracker |
| T-006 | Design   Designer | **Design system v1 and core screens**   Tokens, components, 8 key screens | High | Not Started | T-001 | Figma file reviewed |
| T-007 | Architecture   Tech lead | **Repo, CI/CD and environments**   Monorepo or repos, pipelines, IaC | High | Not Started | T-001 | Green pipeline; deploy to staging |
| T-008 | Architecture   Tech lead | **Spike: Prisma vs Drizzle**   Prototype key queries and migrations | Medium | Not Started | T-007 | Decision D-0xx recorded   *OPEN-08* |
| T-009 | Backend   Backend | **Identity module**   Auth, sessions, recovery, MFA optional | Critical | Not Started | T-007 | Acceptance criteria pass |
| T-010 | Backend   Backend | **Academic data model and admin import**   Org tree, courses, import tool | Critical | Not Started | T-007 | Pilot catalogue loaded   *OPEN-04* |
| T-011 | Backend   Backend | **Verification flow**   Email domain OTP and document review | High | Not Started | T-009, T-010 | Verification tests pass   *OPEN-02* |
| T-012 | Backend   Backend | **Discovery and invitations**   Match scoring, limits, blocks | Critical | Not Started | T-010 | Perf and rule tests |
| T-013 | Backend   Backend | **Study Together engine**   State machine, timers, signals, events | Critical | Not Started | T-009 | Sequence tests; reconnect tests   *OPEN-11* |
| T-014 | Frontend   Frontend | **Study Together UI**   Lobby, active session, summary | Critical | Not Started | T-006, T-013 | E2E journey passes |
| T-015 | Backend   Backend | **XP and streaks ledger**   Append-only XP, streak calc | High | Not Started | T-013 | Ledger tests |
| T-016 | Backend   Backend | **Messaging basic**   1:1 chat, persistence, blocks | High | Not Started | T-009 | Delivery and order tests |
| T-017 | Backend   Backend | **Communities basic**   Course spaces, Q&A, moderation hooks | High | Not Started | T-010 | Community tests |
| T-018 | Safety   Backend + Moderator | **Reporting and moderation tooling**   Report flow, queue, sanctions, appeals | Critical | Not Started | T-009 | Moderation drill passes   *OPEN-12* |
| T-019 | Security   Tech lead | **Threat-model review and pen test**   Fix findings before launch | Critical | Not Started | T-013 | No critical or high open |
| T-020 | Privacy   Backend + Counsel | **Privacy notice, consent records, data rights flow**   Export and deletion | High | Not Started | T-002 | Flows tested |
| T-021 | DevOps   DevOps | **Observability and backups**   Dashboards, alerts, restore drill | High | Not Started | T-007 | Restore tested   *OPEN-10* |
| T-022 | QA   QA | **Test plan and automation**   Playwright journeys, load tests | High | Not Started | T-005 | CI suites running |
| T-023 | Analytics   Product | **Event taxonomy and dashboards**   North Star and funnel | Medium | Not Started | T-005 | Dashboard live |
| T-024 | Pilot   Founder | **Pilot launch plan**   Campus seeding, support, success criteria | High | Not Started | T-018, T-019 | Launch checklist done |


## Appendix B: Decision log, change log, assumptions and open questions

_Decisions and changes_


### Decision log

| ID | Decision | Rationale | Alternatives | Approval | Date | Impacted modules |
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


### Change log

| Version | Date | Change | By |
|---|---|---|---|
| v0.1 | 2026-11-05 | Initial blueprint created from the founder's master prompt; research completed 5 November 2026 | Blueprint team (Claude) |


### Assumption register

See Chapter 24 for the full assumption and verified-fact register (A-01 to A-08, V-01 to V-03).


### Open questions by priority

See Chapter 24 (OPEN-01 to OPEN-16). Critical items: OPEN-01, 02, 06, 07.


## Appendix C: Product Blueprint quality review

_Critical review against the brief_

Self-review against the brief's Part 10 checklist. Honest findings, including weaknesses. **[PROPOSED]**

| Question | Finding |
|---|---|
| Is the product clearly defined? | Yes at concept level; the signature feature is specified in depth. Academic matching quality depends on data not yet collected. |
| Are the unique value propositions credible? | Partly. Research shows each individual mechanic exists elsewhere (Forest shared stakes, Focusmate sessions, Study Together rooms, roomn matching). Credible differentiation is the verified academic graph and fair local-first accountability. Unproven. |
| Are features connected, any missing workflows? | Connected through identity, academic data and sessions. Six modules added. Still thin: offline behaviour, institution administrator tooling, data-subject request handling detail. |
| Are business rules explicit? | Study Together and ledger rules are explicit. Numbers are PROPOSED defaults. |
| Is Study Together feasible? | Yes technically; load is low. The hard problems are correct state handling and fairness. Cannot prove real attention; stated openly. |
| Is the academic structure extensible? | Yes, via generic org-unit tree; untested against real Nigerian catalogues. |
| Security and privacy addressed? | Substantial controls and a STRIDE table. Legal items flagged for counsel; other jurisdictions not analysed. |
| Moderation realistic? | Policy and process defined. Staffing and age assurance unresolved (OPEN-06, 12). |
| Virtual economy controlled? | Design is ledger-based and deferred to Release 3; legal status unresolved. |
| Architecture appropriate for a startup? | Modular monolith with managed services; yes. |
| Is the MVP achievable? | Plausible for a small team, but communities and messaging may be trimmed further if time is tight. |
| Can a newcomer understand what to do? | Chapter 25 and the AI context prompt provide a path. |
| Can the founder track progress? | Tracker, decision log and status dashboard provided; no progress is fabricated. |
| Are all sources verifiable? | Research sources have links. Third-party figures need re-verification. Studaily could not be verified. Technical references are standard documentation not re-opened in this session. |

> **Limitations of this version**  
> Page count is smaller than the requested upper bound because repetition was avoided. No market sizing, no revenue model, no full SQL or code, as instructed. Diagrams are generated from a single source (Graphviz and matplotlib) and match the chapter text.


## Appendix D: Project status dashboard

_Where the project stands, honestly_

| Item | Current state |
|---|---|
| Current phase | Planning and blueprint review (pre-implementation) |
| Completed workstreams | Initial blueprint v0.1 drafted (documentation only). No product work completed. |
| In-progress workstreams | None verified |
| Blocked items | None recorded; T-001 (founder approval) gates all others |
| Pending founder decisions | OPEN-01, 02, 03, 06, 07 (critical or high); see Chapter 24 |
| Major risks | R-01 cold start, R-05 false misses on poor networks, R-06 access control, R-12 student safety |
| Next recommended actions | 1. Founder reviews and approves or edits PROPOSED items (T-001). 2. Engage data-protection counsel (T-002). 3. Run student interviews at a pilot campus (T-003). 4. Check name availability (T-004). 5. Then start T-007 and T-009. |
| Completion percentages | Not reported; none can be verified |


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


## Appendix F: Glossary and final status

_Terms and closing summary_

| Term | Meaning |
|---|---|
| Accountability signal (ping) | A request sent during a study session that the other participant must acknowledge within a response window. |
| ACID | Database transaction properties: atomicity, consistency, isolation, durability. |
| BOLA / IDOR | Broken object-level authorization: accessing another user's object by changing an id. |
| DCPMI | Data Controller or Processor of Major Importance, a category under Nigerian data-protection rules requiring registration. |
| DPIA | Data Protection Impact Assessment. |
| Double-entry ledger | Accounting model where every transaction has balanced debit and credit entries. |
| GAID | General Application and Implementation Directive issued by the NDPC in 2025. |
| Heartbeat | Small periodic message proving a client is connected. |
| Idempotency key | Client-supplied key making a repeated request safe. |
| Modular monolith | One deployable application with strict internal module boundaries. |
| NDPA / NDPC | Nigeria Data Protection Act 2023 / Nigeria Data Protection Commission. |
| Presence | Whether a user's client is currently connected. |
| RAG | Retrieval-augmented generation: model answers using retrieved source passages. |
| Reliability | Rolling score of how consistently a student attends and responds, with excused events excluded. |
| SFU | Selective forwarding unit: server that relays video streams for group calls. |
| STRIDE | Threat categories: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege. |
| STUN / TURN | Protocols helping WebRTC peers connect across networks; TURN relays traffic when direct connection fails. |
| Study Together | Cahootz's signature feature: shared, timed study sessions with accountability. |
| WebRTC | Browser technology for real-time audio and video. |
| XP | Experience points: non-spendable progress measure. |


### Final project status and next steps

This document is a PROPOSED baseline. The next step is founder review. Until T-001 is complete, no implementation should begin. Use the tracker to see what is ready, the decision log to see what is fixed, and Appendix E to continue with an AI assistant.


## References



<a id="ref-1"></a>**[1]** Focusmate — Frequently Asked Questions (official). <https://www.focusmate.com/faq> (accessed 2026-11-05)

<a id="ref-2"></a>**[2]** Focusmate pricing summary (third-party, last updated 21 Mar 2026). <https://mutra.pages.dev/compare/pricing/focusmate> (accessed 2026-11-05)

<a id="ref-3"></a>**[3]** Study Together — official website. <https://studytogether.com> (accessed 2026-11-05)

<a id="ref-4"></a>**[4]** Study Together Discord server listing (member count as displayed at retrieval). <https://discord.com/servers/study-together-595999872222756885> (accessed 2026-11-05)

<a id="ref-5"></a>**[5]** Jisc — Co-design blog on student study communities (Study Together origins; undated post). <https://codesign.jiscinvolve.org/wp/?p=367> (accessed 2026-11-05)

<a id="ref-6"></a>**[6]** Forest — product summary (official, llms.txt). <https://forestapp.cc/llms.txt> (accessed 2026-11-05)

<a id="ref-7"></a>**[7]** Forest — detailed feature description incl. Plant Together (official, llms-full.txt). <https://forestapp.cc/llms-full.txt> (accessed 2026-11-05)

<a id="ref-8"></a>**[8]** StudyStream — App Store listing. <https://apps.apple.com/app/id6461722416> (accessed 2026-11-05)

<a id="ref-9"></a>**[9]** Gridfiti — Studyverse alternatives (reports Studyverse shut down). <https://gridfiti.com/studyverse-alternatives> (accessed 2026-11-05)

<a id="ref-10"></a>**[10]** LeadIQ — Studyverse company profile (conflicting signal: lists company as active). <https://leadiq.com/c/studyverse/609d84b03b112d2d98c7ccb5> (accessed 2026-11-05)

<a id="ref-11"></a>**[11]** roomn: study with friends — App Store listing. <https://apps.apple.com/app/id6761110924> (accessed 2026-11-05)

<a id="ref-12"></a>**[12]** Fiveable — Knowt vs Quizlet (updated 26 Aug 2026). <https://fiveable.me/knowt-vs-quizlet> (accessed 2026-11-05)

<a id="ref-13"></a>**[13]** Nibble — Knowt vs Quizlet (updated 25 Aug 2026). <https://nibble-app.com/blog/knowt-vs-quizlet> (accessed 2026-11-05)

<a id="ref-14"></a>**[14]** TechMoran — myStudyFocus for Nigerian students. <https://techmoran.com/?p=61524> (accessed 2026-11-05)

<a id="ref-15"></a>**[15]** Edusko — Best study apps for Nigerian students (18 Mar 2025). <https://www.edusko.com/blog/best-study-apps-and-tools-for-nigerian-students-in-2025> (accessed 2026-11-05)

<a id="ref-16"></a>**[16]** NDPC — NDP Act General Application and Implementation Directive (GAID) 2025 (official PDF). <https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf> (accessed 2026-11-05)

<a id="ref-17"></a>**[17]** DLA Piper — Nigeria: NDPC issues GAID, key compliance insights (June 2025). <https://privacymatters.dlapiper.com/2025/06/nigeria-ndpc-issues-gaid-key-compliance-insights/> (accessed 2026-11-05)

<a id="ref-18"></a>**[18]** Mondaq / Syntegral — Unlocking GAID 2025 (GAID effective 19 Sep 2025). <https://www.mondaq.com/nigeria/data-protection/1684204/unlocking-gaid-2025-answers-to-all-your-burning-questions> (accessed 2026-11-05)

<a id="ref-19"></a>**[19]** Legalbytes — GAID 2025: what Nigerian businesses need to know (DPIA, children). <https://legalbytes.substack.com/p/gaid-2025-what-nigerian-businesses> (accessed 2026-11-05)

<a id="ref-20"></a>**[20]** Jisc — Discord's growing relevance in the education sector (Oct 2021). <https://codesign.jiscinvolve.org/wp/2021/10/discords-growing-relevance-in-the-education-sector/> (accessed 2026-11-05)

## Technical documentation (standard references; URLs not re-verified in this pass)

- OWASP Top 10 (web application risks). <https://owasp.org/Top10/>
- OWASP API Security Top 10. <https://owasp.org/API-Security/>
- OWASP Application Security Verification Standard (ASVS). <https://owasp.org/www-project-application-security-verification-standard/>
- OWASP Top 10 for LLM Applications. <https://genai.owasp.org/>
- OWASP Cheat Sheet Series (password storage, sessions, file upload). <https://cheatsheetseries.owasp.org/>
- Socket.IO documentation (delivery guarantees, scaling with adapters). <https://socket.io/docs/v4/>
- W3C WebRTC specification and MDN WebRTC guides. <https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API>
- PostgreSQL documentation (transactions, isolation, indexes, row-level security). <https://www.postgresql.org/docs/>
- pgvector project documentation. <https://github.com/pgvector/pgvector>
- NestJS documentation. <https://docs.nestjs.com/>
- Cloudflare R2 documentation. <https://developers.cloudflare.com/r2/>
- Microsoft STRIDE threat modelling overview. <https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats>
