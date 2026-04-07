# Agent Configuration — Incidex

## Agents

| # | Agent | Model | File | Purpose |
|---|---|---|---|---|
| 1 | Triage | claude-haiku-4-5 | `src/lib/agents/triage.ts` | Classify severity, component, type |
| 2 | Log Analyst | claude-sonnet-4 | `src/lib/agents/log-analyst.ts` | Search 200+ logs for patterns |
| 3 | Code Analyst | claude-sonnet-4 | `src/lib/agents/code-analyst.ts` | Scan 9 Medusa.js source files for root cause |
| 4 | Hypothesis Engine | claude-sonnet-4 | `src/lib/agents/hypothesis.ts` | Synthesize findings into ranked hypotheses |
| 5 | Router & Notifier | N/A (deterministic) | `src/lib/agents/router.ts` | Create ticket, assign team, notify via email+Telegram |

## Architecture Heritage

Incidex's agent pipeline derives from [PA·co](https://github.com/PenguinAlleyApps/paco-framework), a production multi-agent operating system with 12 specialized agents across 5 departments. PA·co has autonomously shipped multiple SaaS products across 100+ build sessions. The patterns reused in Incidex include:

- **Model tiering** (Haiku for classification, Sonnet for reasoning) — optimizes cost/latency without sacrificing quality
- **Fault-tolerant parallel execution** (Promise.allSettled) — one agent failing does not crash the pipeline
- **Structured observability** (per-agent traces + structured JSON logs + metrics endpoint) — full pipeline transparency
- **Guardrails layer** (input sanitization before every LLM call) — defense-in-depth against prompt injection

## Project Rules

- TypeScript strict mode — zero `tsc` errors
- All agent outputs are typed JSON (not free text) — ensures reliable downstream parsing
- Every agent call is traced to SQLite with duration, input summary, and output summary
- Graceful degradation — email and Telegram integrations are optional; app works without them
- Output truncation — all LLM responses capped to prevent context overflow

## Sub-Agent Architecture

The 5 agents form a directed acyclic graph (DAG), not a flat sequence:

```
Triage (classifier)
   ├── Log Analyst  ──┐  (parallel sub-agents)
   └── Code Analyst ──┘
                       ↓
               Hypothesis Engine (synthesizer — consumes both analyst outputs)
                       ↓
               Router (action agent — deterministic, no LLM)
```

- **Log Analyst + Code Analyst** are parallel sub-agents of the Hypothesis Engine. They share triage context but do NOT share results with each other — only Hypothesis sees both outputs. This prevents circular reasoning.
- **Hypothesis Engine** is the synthesis agent — it receives all upstream data and produces the final root cause analysis. It is the most expensive agent (~9s avg, Sonnet).
- **Router** is a downstream action agent — purely deterministic (component → team mapping + notification dispatch). It consumes the top hypothesis but does not reason about it.
- **Fault tolerance:** `Promise.allSettled` ensures one analyst failing does not crash the pipeline. Fallback values are provided to the Hypothesis Engine for the failed analyst.
