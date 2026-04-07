# AgentX SRE — Scaling Strategy

How this system goes from a hackathon demo to production-grade incident response.

## Current Architecture (Demo)

| Component | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, standalone output) | Single container, SSR + API in one process |
| Database | SQLite + Drizzle ORM (WAL mode) | Zero-dependency Docker — `docker compose up` just works |
| LLM | Claude API (Haiku + Sonnet) | Cloud-hosted, no GPU infra to manage |
| Deployment | Docker (multi-stage build) | Self-contained, reproducible, portable |
| External deps | Claude API only | No Redis, no Postgres, no message queue |

This architecture is intentionally minimal. Every dependency you add is a dependency you maintain at 3 AM during an outage.

---

## 1. Horizontal Scaling (Compute)

Next.js standalone mode produces a self-contained Node.js server with no external file dependencies. This makes horizontal scaling straightforward:

| Scaling Target | Approach |
|---|---|
| Single node | Docker container as-is (current) |
| Multi-node | Deploy to Kubernetes (Deployment + HPA) or AWS ECS |
| Load balancing | Any L7 balancer (ALB, Traefik, Nginx Ingress) |
| Auto-scaling | CPU/memory-based HPA, or custom metric (active incidents) |

**Why this works:** All API routes are stateless. No in-memory sessions, no sticky connections. Any replica can handle any request. The Docker image is self-contained — no volume mounts, no sidecar containers.

**Estimated capacity per replica:** ~50 concurrent incident analyses (bottleneck is Claude API response time, not compute).

---

## 2. Database Scaling

### Current: SQLite (Single-Node)

SQLite in WAL mode handles the demo perfectly:
- Concurrent reads do not block each other
- Single-writer is fine for one node
- Zero operational overhead — the database is a file inside the container

### Production: PostgreSQL Migration

| Aspect | Detail |
|---|---|
| Target | PostgreSQL via Supabase or AWS RDS |
| Migration effort | ~2 hours |
| What changes | `db.ts` (driver swap) + `drizzle.config.ts` (dialect) |
| What stays the same | Every schema file, every query, every ORM call |

Drizzle ORM abstracts the database driver. The schema definitions and query builder are database-agnostic. Migration is a driver swap, not a rewrite.

### Why SQLite for the hackathon

The alternative was adding a PostgreSQL container to `docker-compose.yml`. That means:
- Another container to pull, configure, and health-check
- Connection string management
- Init scripts for schema
- More failure modes during judging

SQLite eliminated all of that. One container. One command. It works.

---

## 3. LLM Scaling

### Model Tiering (Already Implemented)

| Agent | Model | Cost | Rationale |
|---|---|---|---|
| Agent 1 — Triage | Haiku ($0.25/MTok) | ~$0.0003/call | Classification does not need deep reasoning |
| Agent 2 — Log Analysis | Sonnet ($3/MTok) | ~$0.006/call | Pattern matching across log entries |
| Agent 3 — Code Analysis | Sonnet ($3/MTok) | ~$0.006/call | Needs code comprehension |
| Agent 4 — Resolution | Sonnet ($3/MTok) | ~$0.006/call | Synthesizes findings into action plan |

### Cost Per Incident

```
Triage (Haiku):     ~500 tokens  → $0.0003
Routing (Haiku):    ~300 tokens  → $0.0002
Log Analysis:       ~2000 tokens → $0.006
Code Analysis:      ~2000 tokens → $0.006
Resolution:         ~1500 tokens → $0.005
─────────────────────────────────────────
Total per incident:               ~$0.01–0.02
```

### Cost Projections

| Daily Incidents | Daily Cost | Monthly Cost |
|---|---|---|
| 100 | $1.50 | $45 |
| 1,000 | $15 | $450 |
| 10,000 | $150 | $4,500 |

### Why Haiku for Triage

Triage is a classification task: read the alert, assign severity, pick a category. Haiku is 10x cheaper and 3x faster than Sonnet for this. Using Sonnet for triage would be like using a forklift to move a chair.

### Parallel Execution

Agents 2 (Log Analysis) and 3 (Code Analysis) run in parallel. They consume independent data sources (logs vs. source code) with no dependency between them. This reduces wall-clock time by ~40% compared to sequential execution.

---

## 4. Observability at Scale

### Current: SQLite Traces Table

Every agent execution is logged with:
- `agent_name`, `model`, `duration_ms`
- `input_summary`, `output_summary`
- `token_count`, `cost_estimate`
- `incident_id` for correlation

### Production: OpenTelemetry Export

The trace format already follows OTel-inspired conventions. Migration path:

| Current | Production |
|---|---|
| SQLite `traces` table | OTel Collector → Datadog / Grafana / Jaeger |
| Dashboard page in app | Grafana dashboards with alerting |
| Manual inspection | Automated anomaly detection on agent latency |

The traces table schema was designed with this migration in mind. Each row maps cleanly to an OTel span.

---

## 5. Integration Scaling

### Adapter Pattern

The system uses a clean separation between agent logic and external integrations:

| Integration | Current (Demo) | Production |
|---|---|---|
| Ticketing | Mock (in-memory) | Jira / Linear API |
| Notifications | Mock (logged) | Slack webhooks / Resend email |
| Monitoring source | Simulated alerts | PagerDuty / Datadog webhooks |
| Runbook execution | Suggested commands | SSH/kubectl via approved runner |

Agent logic never touches integration details directly. Swapping the mock layer for real APIs does not require changing any agent prompt or orchestration code.

---

## Assumptions

1. **Claude API rate limits** stay at current levels (4,000 RPM for Sonnet, higher for Haiku)
2. **Incident distribution** follows Pareto: 80% low/medium severity (Haiku handles fast), 20% critical (full Sonnet pipeline)
3. **Peak concurrent load**: 100 simultaneous incidents, handled by horizontal replica scaling + API rate limit headroom
4. **Network latency** to Claude API is <200ms (US regions)
5. **Database migration** to PostgreSQL happens before multi-node deployment

## Technical Decisions Summary

| Decision | Alternative | Why We Chose This |
|---|---|---|
| SQLite over Postgres | Postgres in Docker Compose | Zero-dependency container; judges run `docker compose up` and it works |
| Haiku for triage | Sonnet for everything | 10x cheaper, 3x faster; classification is not a reasoning task |
| Parallel agents 2+3 | Sequential pipeline | Independent data sources, ~40% wall-clock reduction |
| Standalone Next.js | Next.js + Nginx reverse proxy | Single container, single process, less to break |
| Drizzle ORM | Raw SQL / Prisma | Type-safe, database-agnostic, minimal overhead |
| WAL mode SQLite | Default journal mode | Allows concurrent reads during writes |

---

## The One-Liner

This system scales by doing three things: swap SQLite for Postgres, add replicas behind a load balancer, and replace mock integrations with real APIs. The agent logic, prompts, and orchestration do not change.
