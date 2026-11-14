---
title: "API and Realtime Specification"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# API and Realtime Specification

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 18.

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

