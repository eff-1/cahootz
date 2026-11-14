---
title: "Scalability and Infrastructure"
project: CAHOOTZ
version: "v0.1 (Draft for founder review)"
date: "5 November 2026"
status: PROPOSED baseline (awaiting founder approval)
---

# Scalability and Infrastructure

> Version v0.1 (Draft for founder review) · 5 November 2026 · Index: [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) · Tracker: [PROJECT_TRACKER.md](PROJECT_TRACKER.md) · Decisions: [DECISION_LOG.md](DECISION_LOG.md)
> Labels: **[CONFIRMED]** fixed by the founder · **[PROPOSED]** recommendation awaiting approval · **[OPEN]** unresolved.

Source chapters in the PDF edition: 19.

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

