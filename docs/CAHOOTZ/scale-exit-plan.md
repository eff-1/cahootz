# Cahootz Scale Exit Plan: Migration from SQLite to PostgreSQL & Redis

## 1. Executive Summary & Context

Cahootz began its pilot implementation using an embedded, single-process modular monolith architecture:
- **Runtime**: Node.js 22 LTS with `--experimental-strip-types`.
- **Primary Persistence**: SQLite via `node:sqlite` in Write-Ahead Logging (`WAL`) mode with `BEGIN IMMEDIATE` per-operation transactions.
- **Observability & Health**: Native `/healthz`, `/readyz`, and Bearer-protected `/metrics` Prometheus endpoints.
- **Transport**: Native Node HTTP server with reverse-proxy termination (Caddy/Nginx) for HTTPS, HSTS, and Server-Sent Events (SSE).

This architecture was selected under **Decision D-020 & D-021** to minimize cloud infrastructure costs, eliminate external network database roundtrips on Nigerian networks, and allow the founder to run a self-contained pilot for 20–50 students on a $5/month VPS.

However, SQLite is fundamentally single-writer and single-instance. This document defines the exact **scale thresholds** that trigger migration and the **step-by-step engineering roadmap** to transition to PostgreSQL and Redis without downtime or data loss.

---

## 2. Quantitative Scale Triggers & Thresholds

Migration from embedded SQLite to PostgreSQL + Redis must begin when **any single threshold** below is reached in staging or production telemetry:

| Metric Category | Current Safe Envelope (SQLite WAL) | Warning Threshold (Plan Migration) | Hard Trigger (Execute Migration) | Detection Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Peak Active Sessions** | 1 – 150 concurrent study pairs (300 users) | 250 concurrent pairs (500 users) | **> 500 concurrent pairs (1,000 users)** | `cahootz_sse_active_connections` gauge on `/metrics` |
| **Write Lock Wait Latency** | < 2 ms p95 | > 20 ms p95 | **> 50 ms p95** or any `SQLITE_BUSY` error | SQLite transaction timer in `CahootzSqlStore` |
| **Total Registered Users** | < 1,000 students | 2,500 students | **> 5,000 registered accounts** | `cahootz_sqlite_table_rows{table="users"}` |
| **Database File Size** | < 500 MB | 2 GB | **> 10 GB** | Disk volume monitoring on VPS host |
| **Moderation Queue Volume** | < 100 open reports/day | 250 open reports/day | **> 500 open reports/day** | `cahootz_moderation_open_reports` gauge |
| **High Availability SLA** | Single VPS (tolerates planned restarts) | Institutional partnership request | **Multi-node zero-downtime SLA required** | Institutional contract requirement |

---

## 3. Target Architecture

```
                       [ Cloudflare / DNS / DDoS Protection ]
                                         │
                                [ Caddy / NGINX ]
                            (TLS 1.3 / HSTS / HTTP/2)
                                         │
             ┌───────────────────────────┴───────────────────────────┐
             ▼                                                       ▼
   [ Node API Monolith 1 ]                                 [ Node API Monolith 2 ]
   (Cluster / Container)                                   (Cluster / Container)
             │                                                       │
             ├───────────────────────────┬───────────────────────────┤
             ▼                           ▼                           ▼
   [ PostgreSQL 16+ ]             [ Redis 7 Cluster ]        [ S3 / Cloudflare R2 ]
   (Primary + Read Replica)       (Presence, SSE PubSub,     (Off-site Backups,
   (All 18 tables persisted)       Rate Limiters, Jobs)       NDPA Data Exports)
```

### Components:
1. **Database**: Managed PostgreSQL 16+ (AWS RDS, Supabase, Neon, or Aiven) with connection pooling (PgBouncer).
2. **Pub/Sub & Presence Broker**: Redis 7+ for multi-node event bus (`DomainEventBus`) fan-out and shared presence state.
3. **Blob Storage**: S3-compatible object storage (Cloudflare R2 or AWS S3 af-south-1) with AES-256-GCM encryption for offsite backups.
4. **Compute**: Stateless Docker containers deployed to AWS ECS, Fly.io, or Railway behind an Application Load Balancer.

---

## 4. Step-by-Step Migration Execution Plan

The migration preserves all 18 existing tables and enforces strict zero-data-loss guarantees.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Database Schema & Client Preparation (Prisma / pg adapter)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Data Extraction & Pre-Migration Dry Run                       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Dual-Write & Shadow Read Validation                           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Maintenance Window & Cutover (< 15 Minutes)                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Post-Cutover Verification & Decommission                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Schema & Driver Preparation
1. Update `packages/shared/prisma/schema.prisma` from SQLite provider to PostgreSQL provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Run `npx prisma migrate dev --name init_postgres` to generate initial PostgreSQL DDL migrations.
3. Verify all 18 tables, indices, foreign keys, and constraints match `DATABASE_DESIGN.md`.

### Phase 2: Offline Snapshot Migration Drill
1. Extract a full canonical snapshot using `CahootzSqlStore.exportSnapshot()`.
2. Execute migration ETL script (`scripts/migrate-sqlite-to-postgres.ts`):
   - Migrates entities in topological foreign key dependency order:
     1. `institutions` -> `org_units` -> `programmes` -> `levels` -> `courses`
     2. `users` -> `auth_sessions` -> `student_profiles` -> `student_enrolments`
     3. `study_invitations` -> `study_sessions` -> `session_events` -> `session_disputes`
     4. `xp_ledger` -> `direct_messages` -> `community_posts` -> `community_answers`
     5. `moderation_reports` -> `sanctions` -> `appeals` -> `sensitive_admin_actions` -> `audit_log` -> `consent_log`
3. Verify row counts and hash digests between SQLite source and PostgreSQL target.

### Phase 3: Redis Event Bus & SSE Fan-Out
1. Replace in-memory `DomainEventBus` with Redis Pub/Sub adapter (`RedisDomainEventBus`).
2. Replace local `sseClientsBySession` map with Redis pub/sub channel subscriptions so study partners connected to different API instances receive instant heartbeat and ping events.

### Phase 4: Production Cutover Window (< 15 Minutes)
1. Schedule a 15-minute maintenance window at 03:00 WAT (low Nigerian student activity).
2. Display maintenance banner in web client via Caddy/Nginx.
3. Stop API traffic: `server.close()`.
4. Run final incremental sync from SQLite WAL to PostgreSQL.
5. Point environment variable `DATABASE_URL=postgres://...` and `REDIS_URL=redis://...`.
6. Start containerized API instances connected to PostgreSQL.
7. Run automated verification drill (`scripts/staging-email-smoke.ts` and E2E test suite).
8. Remove maintenance banner and resume public traffic.

### Phase 5: Post-Cutover Verification & Rollback Plan
- **Verification**: Run `npm test` against the live PostgreSQL staging environment. Assert table count parity.
- **Rollback Safeguard**: The original `.sqlite` and WAL files remain preserved on disk. If any critical database errors occur within 60 minutes of cutover, the reverse proxy configuration is immediately toggled back to the single-instance SQLite process.

---

## 5. Cost & Resource Projections

| Tier | Concurrent Pairs | Infrastructure Spec | Estimated Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Phase 1 Pilot (Current)** | 20–100 pairs | 1x VPS (2 vCPU, 4GB RAM, NVMe) + SQLite WAL | **$5 – $10 / month** |
| **Phase 2 Expansion** | 100–500 pairs | 1x VPS (4 vCPU, 8GB RAM) + SQLite WAL + Offsite S3 | **$20 – $40 / month** |
| **Phase 3 PostgreSQL** | 500–5,000 pairs | 2x Node Containers + Managed Postgres (2 vCPU, 4GB) + Managed Redis | **$70 – $150 / month** |
| **Phase 4 National Scale** | 5,000+ pairs | Auto-scaling ECS/K8s + Multi-AZ Postgres RDS + Redis Cluster | **$300 – $600 / month** |

---

## 6. Approvals & Decision Status

- **Status**: Formally recorded as architecture decision **D-022** in `docs/CAHOOTZ/DECISION_LOG.md`.
- **Approved for Pilot Stage**: Single-instance SQLite WAL with per-operation transactions.
- **Approved Migration Target**: PostgreSQL 16 + Redis 7 upon breaching any threshold in Section 2.
