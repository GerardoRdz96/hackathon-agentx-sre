# Incidex — Quick Start Guide

## Docker (Recommended)

```bash
git clone https://github.com/GerardoRdz96/hackathon-agentx-sre.git
cd hackathon-agentx-sre
cp .env.example .env
# Fill in your ANTHROPIC_API_KEY in .env
docker compose up --build
# Open http://localhost:3000
```

## Local Development

```bash
git clone https://github.com/GerardoRdz96/hackathon-agentx-sre.git
cd hackathon-agentx-sre
cp .env.example .env
# Fill in your ANTHROPIC_API_KEY in .env
npm install
npm run dev
# Open http://localhost:3000
```

## How It Works

Submit an incident (text + optional screenshot) and watch 5 AI agents work:

1. **Triage Agent** (Haiku) — Classifies severity, component, type
2. **Log Analyst** (Sonnet) — Searches logs for anomalies *(parallel)*
3. **Code Analyst** (Sonnet) — Searches codebase for root cause *(parallel)*
4. **Hypothesis Agent** (Sonnet) — Synthesizes ranked hypotheses
5. **Router Agent** (Haiku) — Creates ticket, assigns team, sends notifications

All agent traces are recorded for full observability.

## Notes

- **LLM Provider:** This project uses the Anthropic Claude API directly (Haiku 4.5 + Sonnet 4). OpenRouter is not supported or required.
- **Optional integrations:** Resend (email) and Telegram (alerts) enhance the experience but are optional. Without them, notifications are still stored in the database and visible in the UI.
- **Pre-seeded data:** The app starts with 2 sample incidents so you can explore the dashboard immediately. Submit a new incident to see the full pipeline in action.
