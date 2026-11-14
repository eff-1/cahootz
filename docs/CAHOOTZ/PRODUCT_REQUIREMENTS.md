---
title: "Product Requirements (personas, roles, metrics)"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Product Requirements (personas, roles, metrics)

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 04, 23.

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

