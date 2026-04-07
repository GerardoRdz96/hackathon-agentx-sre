# SRE Agent - Quick Start

## Local Development

```bash
git clone <repo-url>
cd hackathon-agentx-sre
cp .env.example .env
# Fill in your ANTHROPIC_API_KEY in .env
npm install
npm run dev
# Open http://localhost:3000
```

## Docker

```bash
cp .env.example .env
# Fill in your ANTHROPIC_API_KEY in .env
docker compose up --build
# Open http://localhost:3000
```

## How It Works

Submit an incident (text + optional screenshot) and watch 5 AI agents work:

1. **Triage Agent** (Haiku) - Classifies severity, component, type
2. **Log Analyst** (Sonnet) - Searches logs for anomalies
3. **Code Analyst** (Sonnet) - Searches codebase for root cause
4. **Hypothesis Agent** (Sonnet) - Synthesizes ranked hypotheses
5. **Router Agent** - Creates ticket, assigns team, sends notifications

All agent traces are recorded for full observability.
