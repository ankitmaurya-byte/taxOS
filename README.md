# TaxOS — AI-First US Tax & Compliance Platform

An AI-first tax and compliance platform for startup founders. AI handles intake, document extraction, form prefill, and risk scoring. CPAs review and validate. Founders approve and submit.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Seed the database with demo data (80 orgs, 50 CPAs, thousands of filings)
pnpm db:fake-seed

# Start development servers (API + Frontend)
pnpm dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

## Demo Credentials

Quick-login buttons on the login page — no need to type credentials.

| Role         | Email                    | Password     |
|--------------|--------------------------|--------------|
| Admin        | superadmin@taxos.ai      | admin1234    |
| Founder      | founder@demo.taxos.ai    | password123  |
| Team Member  | team@demo.taxos.ai       | password123  |
| CPA          | cpa@demo.taxos.ai        | password123  |

The demo founder and team member share the same organization (Acme Technologies). The demo CPA is pre-assigned to that organization with multiple filings.

## Architecture

```
taxos/
├── apps/
│   ├── web/               # React 18 + Vite + Tailwind
│   │   ├── src/app/       # Layout, Sidebar, TopBar, routing
│   │   ├── src/pages/     # All page components
│   │   ├── src/pages/admin/  # Admin-only pages
│   │   ├── src/components/   # Shared UI components
│   │   ├── src/stores/    # Zustand state management
│   │   └── src/lib/       # API client, access control, utils
│   └── api/               # Express + TypeScript + Drizzle ORM + SQLite
│       ├── src/agents/    # AI agent implementations
│       ├── src/controllers/  # Route handlers
│       ├── src/routes/    # Express route definitions
│       ├── src/db/        # Schema, migrations, seed data
│       ├── src/lib/       # RBAC, mailer, audit logging, errors
│       └── src/middleware/ # Auth, upload, permissions
└── packages/
    └── shared/            # Shared Zod schemas & TypeScript types
```

## Key Features

### Role-Based Workflows

- **Founders** — Manage entities, view filings, approve submissions, invite team members
- **Team Members** — Granular permission system (10 permission keys). Founders assign via templates or custom config. AI suggests templates based on use case.
- **CPAs** — Review filings, claim from queue (round-robin escalation), approve/reject with lock system
- **Admins** — Platform oversight: founder applications, org management, global entities/filings, chat monitoring, CPA onboarding

### AI Agents

| Agent            | Purpose                                         |
|------------------|-------------------------------------------------|
| Intake Agent     | Conversational interview to gather filing data   |
| Deadline Agent   | Auto-calculates filing deadlines per entity type |
| Document Agent   | Extracts structured data + context from uploads  |
| Prefill Agent    | Auto-fills tax form fields from gathered data    |
| Audit Risk Agent | Scores audit risk (0-100) with reasoning         |
| Tax Q&A Agent    | Streaming tax advisor with citations             |

### HITL (Human-in-the-Loop) Gates

- AI can never submit filings, auto-approve, or delete documents
- CPA must advance filings to founder approval stage
- Founder approval required before submission
- High audit risk (>60) triggers mandatory CPA review
- Every AI action logged with reasoning in the audit trail

### Document Management

- Drag-and-drop upload with auto-extraction
- Document vaults with folders for organization
- AI tagging and confidence scoring
- Bulk select, download, delete
- Grid and list views with pagination

### Permission System

- 10 granular permission keys for team members
- Role templates (system + org-specific) for quick assignment
- AI template suggestion when inviting (debounced, based on use case)
- Minimum 2 permissions enforced
- Auto-detect custom vs template match
- Sidebar and API calls gated by permissions — no nav item shown if no access, no fetch made

### Invite System

- 24-hour expiry on all invites (team members and CPAs)
- AI-suggested permission templates on invite
- ESC-to-close with discard confirmation on dirty modals

### Approval Queue

- Pending/resolved split with stats
- Click-through to filing details
- Reject button hidden until hover
- AI chat for asking questions about approvals
- Escalate to CPA workflow

### Audit Trail

- Table-based log with actor icons and color-coded badges
- Filter by actor type, search, date range
- Expandable rows for inputs/outputs (JSON)
- CSV export (filtered + all)

### Chat System

- 3-channel chat: Organization, Founder Network, CPA Network
- SSE-based real-time notifications

## Scripts

| Command              | Purpose                                        |
|----------------------|------------------------------------------------|
| `pnpm dev`           | Start API + frontend in parallel               |
| `pnpm build`         | Build both apps for production                 |
| `pnpm db:seed`       | Seed with minimal data                         |
| `pnpm db:fake-seed`  | Seed with full demo data (80 orgs, 50 CPAs)    |
| `pnpm db:migrate`    | Run database migrations                        |
| `pnpm db:generate`   | Generate Drizzle migration files               |

## Design System

The UI follows a Stripe-inspired design system documented in `DESIGN.md`:

- **Font**: sohne-var with `font-feature-settings: "ss01"`, weight 300 for headings
- **Primary color**: `#533afd` (Stripe purple)
- **Headings**: `#061b31` (deep navy, not black)
- **Border radius**: 4-6px (conservative, no pill shapes)
- **Shadows**: Blue-tinted multi-layer (`rgba(50,50,93,0.25)`)
- **Numbers**: Tabular numerals (`"tnum"`) for financial data

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, Express, Drizzle ORM, SQLite, Anthropic Claude API, JWT auth, Zod validation, Lucide icons
