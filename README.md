# TaxOS — AI-First US Tax & Compliance Platform

An AI-first tax and compliance platform for startup founders. AI does 90% of the work, CPAs review, founders only approve.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Seed the database
pnpm db:seed

# Start development servers (API + Frontend)
pnpm dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

### Demo Credentials

| Role    | Email           | Password |
|---------|-----------------|----------|
| Founder | demo@taxos.ai   | demo1234 |
| CPA     | cpa@taxos.ai    | demo1234 |

## Architecture

```
taxos/
├── apps/web/          # React 18 + Vite + Tailwind + shadcn/ui
├── apps/api/          # Express + TypeScript + Drizzle ORM + SQLite
└── packages/shared/   # Shared Zod schemas & types
```

## AI Agents

| Agent           | Purpose                                    |
|-----------------|--------------------------------------------|
| Intake Agent    | Conversational interview for filing data   |
| Deadline Agent  | Auto-calculates filing deadlines           |
| Document Agent  | Extracts structured data from documents    |
| Prefill Agent   | Auto-fills tax form fields                 |
| Audit Risk Agent| Scores audit risk (0-100)                  |
| Tax Q&A Agent   | Streaming tax advisor with citations       |

## HITL Gates

- AI can **never** submit filings, auto-approve, or delete documents
- CPA must advance filings to founder approval stage
- Founder approval required before submission
- High audit risk (>60) triggers mandatory CPA review
- Every AI action is logged with reasoning in the audit trail

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Express, Drizzle ORM, SQLite, Anthropic Claude API, JWT auth, Zod validation
