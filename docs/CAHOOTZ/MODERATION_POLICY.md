---
title: "Moderation Policy and Student Safety"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Moderation Policy and Student Safety

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 12.

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

