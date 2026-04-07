# Incidex — Project Rules (Team-Wide Agent Configuration)

> This file configures AI coding agents (Claude Code, Cursor, Copilot) working on this codebase.
> Read this before making any changes.

## Project Overview
- **Name:** Incidex — AI-Powered SRE Incident Agent
- **Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Anthropic Claude API, SQLite + Drizzle ORM
- **Architecture:** 5-agent pipeline (Triage → [Log + Code parallel] → Hypothesis → Router)

## File Structure
```
src/lib/agents/     — Individual agent implementations (one file per agent)
src/lib/claude.ts   — All Claude API calls with system prompts
src/lib/pipeline.ts — Pipeline orchestrator (runs all 5 agents)
src/lib/guardrails.ts — Input sanitization + prompt injection defense
src/lib/dedup.ts    — Incident deduplication (Jaccard similarity)
src/lib/traces.ts   — Per-agent trace recording to SQLite
src/lib/logger.ts   — Structured JSON logging (stdout)
src/lib/metrics.ts  — Aggregated metrics from SQLite
src/app/components/ — React client components (dashboard, forms, panels)
src/app/api/        — Next.js API routes (incidents CRUD, metrics)
```

## Agent Behavior Rules
1. **Every Claude API call** must go through `validateAndSanitize()` from `guardrails.ts` BEFORE sending
2. **Every Claude response** must go through `enforceOutputLength()` BEFORE returning
3. **Every agent output** must be typed JSON — no free text responses. Define interfaces in the agent file.
4. **Every agent call** must be traced via `startTrace()` / `endTrace()` from `traces.ts`
5. **System prompts** go in the `system` parameter, NOT in the user message. See `claude.ts` for examples.

## Model Selection Rules
- **Haiku 4.5** (`claude-haiku-4-5-20251001`) — classification, fast structured output. Use for tasks that need speed over depth.
- **Sonnet 4** (`claude-sonnet-4-20250514`) — reasoning, code analysis, synthesis. Use for tasks that need understanding.
- **Router does NOT use an LLM** — it is deterministic (component → team mapping). Do not add Claude calls to the router.

## Integration Rules
- **Email (Resend)** and **Telegram (Bot API)** are optional. The app MUST work without them.
- Use `.catch(() => {})` on integration calls (fire-and-forget). Pipeline must not block on email/Telegram.
- Check for env vars before calling integrations. Graceful degradation, not errors.

## Coding Conventions
- TypeScript strict mode — zero `tsc` errors
- No `any` types — use proper interfaces
- All errors must be traced (via `traces.ts`) and logged (via `logger.ts`)
- Use `Promise.allSettled` (not `Promise.all`) for parallel agents — fault tolerance over speed
- SQLite operations are synchronous (`.run()`, `.get()`, `.all()`) — this is intentional for simplicity

## Testing Rules
- Every guardrail function needs a test case in `src/__tests__/guardrails.test.ts`
- Security tests must show input → guard → result (not just descriptions)
- E2E tests are manual — document in test-plan.md with checkboxes

## What NOT to Change
- `pipeline.ts` orchestration order (Triage → parallel analysts → Hypothesis → Router)
- `TEAM_MAP` in `router.ts` (component → team mapping is hardcoded by design)
- SQLite schema in `page.tsx` `initDb()` (breaking change, requires migration)
- Pre-seeded data in `initDb()` (ensures consistent demo experience)
