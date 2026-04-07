# Incidex — Bitacora de Desarrollo (Hackathon AgentX 2026)

> Este archivo existe para que PA·co recupere contexto si pierde la sesion.
> ACTUALIZAR cada vez que se complete un cambio significativo.
> LEER PRIMERO si PA·co pierde contexto.

## Proyecto
- **Nombre:** Incidex — AI-Powered SRE Agent
- **Repo local:** c:\Users\luisg\OneDrive\Escritorio\hackathon-agentx-sre\
- **Deploy:** https://hackathon-agentx-2026.vercel.app
- **Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Drizzle ORM, SQLite, Claude API
- **Branding:** "Incidex — AI-Powered SRE Agent by Penguin Alley"

## Assignment (del hackathon)
**Build an SRE Incident Intake & Triage Agent** para e-commerce.
Core flow: Submit → Triage → Ticket → Notify team → Resolve → Notify reporter.
Contexto completo: `penguin-alley-paco-v2/modules/hackathons/context/`

## Deadlines
- **Apr 9 9PM CST — SUBMISSION DEADLINE**
- Deliverables: prototype + README + demo video (YouTube, 3min, English, #AgentXHackathon) + AGENTS_USE.md
- Repo must include: README, AGENTS_USE.md, SCALING.md, QUICKGUIDE.md, docker-compose.yml, .env.example, LICENSE (MIT)

## Evaluation
- Technical Concept 40% | Impact 20% | Creativity 20% | Presentation 20%
- Process: LLM screening → Mentor review (NO code execution) → Top 10 expert panel + pitch

## Lo que funciona (Apr 7 ~21:00 CST):
- 5 agentes SRE: Triage (Haiku), Log Analyst (Sonnet), Code Analyst (Sonnet), Hypothesis Engine (Sonnet), Router (Haiku)
- Pipeline E2E en 6-8 segundos (vs 47 min manual = 91% reduction)
- Log + Code analysts corren en PARALELO (Promise.all)
- UI: Dark mission control, incident list, 5 panels (overview, ticket, notifications, trace timeline, hypotheses)
- Multimodal: text + screenshot upload (Claude Vision)
- Guardrails: canary strings, regex injection filter, HTML strip, null bytes, length validation
- Observability: structured logs, per-agent traces con timestamps, /api/metrics endpoint
- Ticketing: Linear-style ticket UI con summary, team, assignee, suggested fix
- Real email via Resend (hello@penguinalley.com) — branded HTML
- Real Telegram alerts for critical/high severity
- Animated pipeline stepper during processing
- Resolution flow: Mark Resolved → reporter notified
- Simulated e-commerce: 9 Medusa.js source files + 200+ log entries
- Docker + docker-compose funcional
- Docs: README.md, AGENTS_USE.md, SCALING.md, QUICKGUIDE.md, LICENSE (MIT)

## Problema actual (EN PROGRESO):
- **Panel de NOTIFICATIONS**: contenido se cortaba. FIX: max-h 250→400px, removed overflow-hidden, break-all en emails.
- CEO pidio verificar que el fix se vea bien.

## Pendiente (prioridad):
1. ~~Notifications panel clipping~~ → FIXED (verificar)
2. Incident Selection — click en lista cambia Mission Control (plan en abstract-yawning-candle.md)
3. Pipeline Stepper auto-hide fix — debe quedarse visible
4. Video demo (3 min, English, YouTube, #AgentXHackathon)
5. Final polish + deploy
6. Submission antes de Apr 9 9PM CST

## Archivos clave:
- `src/app/page.tsx` — Main page (server component)
- `src/app/components/mission-control.tsx` — Mission Control 5-panel dashboard
- `src/app/components/incident-list.tsx` — Incident history
- `src/app/components/incident-form.tsx` — Submit form + pipeline stepper
- `src/app/components/pipeline-stepper.tsx` — Animated agent progress
- `src/lib/pipeline.ts` — 5-agent orchestrator
- `src/lib/agents/` — Individual agent files (triage, log-analyst, code-analyst, hypothesis, router)
- `src/lib/guardrails.ts` — Input sanitization
- `src/lib/medusa-code.ts` — 9 simulated source files
- `src/lib/simulated-logs.ts` — 200+ log entries

## Historial de Cambios
- [Apr 7 AM] Opening session, assignment received
- [Apr 7 PM] Full E2E pipeline working, 5 agents, real email+telegram
- [Apr 7 PM] CEO test: notifications panel clips content → FIX applied (max-h, overflow)
- [Apr 7 PM] Context saved to modules/hackathons/context/ (assignment, deliverables, rules, tech reqs, opening summary)
