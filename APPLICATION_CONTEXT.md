---
title: TaxOS - Application Context
type: project-context
version: 1.0.0
created: 2026-04-08
tags:
  - monorepo
  - tax-compliance
  - ai-agents
  - saas
  - fullstack
---

# TaxOS - Application Context

## Overview

```yaml
name: TaxOS
description: AI-first tax compliance platform with human-in-the-loop workflows
architecture: Monorepo (pnpm workspaces)
package_manager: pnpm@10.33.0
workspaces:
  - apps/api
  - apps/web
  - packages/shared
```

---

## Tech Stack

```yaml
backend:
  runtime: Node.js
  language: TypeScript 5.7.3
  framework: Express 4.21.2
  database: SQLite (better-sqlite3 11.7.0)
  orm: Drizzle ORM 0.38.3
  ai_provider: Google Generative AI (Gemini 2.5-flash)
  auth: JWT (jsonwebtoken 9.0.2)
  password_hashing: bcrypt 5.1.1
  file_uploads: Multer 1.4.5-lts.1
  validation: Zod 3.24.2
  port: 3001

frontend:
  language: TypeScript 5.7.3
  framework: React 18.3.1
  bundler: Vite 6.0.7
  routing: React Router 7.1.1
  server_state: TanStack React Query 5.64.2
  client_state: Zustand 5.0.3
  styling: Tailwind CSS 3.4.17
  ui_library: shadcn/ui (Radix UI primitives)
  icons: Lucide React 0.469.0
  charts: Recharts 3.8.1
  file_upload_ui: React Dropzone 15.0.0
  dates: date-fns 4.1.0
  port: 5173

shared:
  purpose: Zod schemas and TypeScript types shared across API and Web
  exports:
    - schemas/entity
    - schemas/filing
    - schemas/document
    - schemas/agent
```

---

## Database Schema

```yaml
database:
  engine: SQLite
  file: ./taxos.db (configurable via DATABASE_URL)
  mode: WAL
  foreign_keys: enabled
  migration_tool: Drizzle Kit (drizzle-kit push)
  migration_output: /apps/api/src/db/migrations/
  seed_command: pnpm db:seed

tables:
  organizations:
    purpose: Multi-tenant org container
    key_fields:
      - id (text, PK)
      - name (text)
      - plan (text) # free | starter | pro
      - createdAt (text)

  users:
    purpose: Authenticated users with role-based access
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - email (text, unique)
      - passwordHash (text)
      - name (text)
      - role (text) # founder | team_member | cpa | admin

  entities:
    purpose: Tax entities (companies) managed by the org
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - legalName (text)
      - entityType (text) # C-Corp | LLC | S-Corp | Pvt-Ltd
      - status (text) # active | inactive | dissolved
      - stateOfIncorporation (text)
      - ein (text) # XX-XXXXXXX format
      - fiscalYearEnd (text) # MM-DD
      - foreignSubsidiaries (text) # JSON array
      - country (text)

  filings:
    purpose: Tax filing lifecycle tracking
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - entityId (FK → entities)
      - formType (text)
      - formName (text)
      - status (text) # see filing_workflow below
      - taxYear (text)
      - deadlineId (FK → deadlines, optional)
      - prefilled (text) # JSON
      - intakeData (text) # JSON
    status_workflow:
      - intake        # Initial data collection via AI chat
      - ai_prep       # AI processing & prefilling
      - cpa_review    # CPA professional review
      - founder_approval # Founder sign-off required
      - submitted     # Filed with IRS
      - archived      # Completed & stored

  deadlines:
    purpose: Auto-calculated tax deadlines per entity
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - entityId (FK → entities)
      - formType (text)
      - dueDate (text)
      - urgencyScore (integer)
      - status (text)

  documents:
    purpose: Uploaded files with AI extraction metadata
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - entityId (FK → entities)
      - fileName (text)
      - filePath (text)
      - mimeType (text)
      - extractedData (text) # JSON from AI vision
      - confidence (real) # 0.0 - 1.0
      - tags (text) # JSON array

  approval_queue:
    purpose: Human-in-the-loop approval items
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - filingId (FK → filings)
      - queueType (text) # founder | cpa
      - status (text) # pending | approved | rejected | escalated
      - reason (text)

  auditLog:
    purpose: Immutable action log for compliance
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - actorType (text) # ai | cpa | founder | system
      - actorId (text)
      - action (text)
      - reasoning (text)
      - inputs (text) # JSON
      - outputs (text) # JSON
      - timestamp (text)

  agentConversations:
    purpose: Multi-turn AI chat history
    key_fields:
      - id (text, PK)
      - orgId (FK → organizations)
      - filingId (FK → filings)
      - messages (text) # JSON array of {role, content}
```

---

## Authentication & Authorization

```yaml
auth:
  mechanism: JWT (Bearer token)
  secret: JWT_SECRET env var (min 32 chars)
  token_payload:
    - userId
    - orgId
    - role
  expiry: 7 days
  storage: localStorage (key: taxos_token)
  header_format: "Authorization: Bearer <token>"

  endpoints:
    register: POST /api/auth/register
    login: POST /api/auth/login
    me: GET /api/auth/me

  roles:
    founder:
      - Full access to all features
      - Can approve filings
      - Sees founder-queued approvals
    team_member:
      - Standard access
    cpa:
      - CPA review access
      - Sees CPA-queued approvals
    admin:
      - Full system access

  multi_tenancy:
    strategy: orgId-scoped queries
    isolation: Every table has orgId FK, all queries filtered by req.user.orgId
```

---

## API Endpoints

```yaml
routes:
  auth:
    base: /api/auth
    endpoints:
      - method: POST
        path: /register
        body: { email, password, name, orgName }
        returns: { token, user }
        auth: none
      - method: POST
        path: /login
        body: { email, password }
        returns: { token, user }
        auth: none
      - method: GET
        path: /me
        returns: { user }
        auth: JWT

  entities:
    base: /api/entities
    controller: entities.controller.ts
    endpoints:
      - { method: GET,    path: /,     returns: "Entity[]",  auth: JWT }
      - { method: POST,   path: /,     body: createEntitySchema, returns: Entity, auth: JWT }
      - { method: GET,    path: /:id,  returns: Entity,      auth: JWT }
      - { method: PUT,    path: /:id,  body: updateEntitySchema, returns: Entity, auth: JWT }
      - { method: DELETE, path: /:id,  returns: void,        auth: JWT }
    notes: Creating an entity auto-triggers deadline calculation

  filings:
    base: /api/filings
    controller: filings.controller.ts
    endpoints:
      - { method: GET,  path: /,               returns: "Filing[]", auth: JWT }
      - { method: POST, path: /,               body: createFilingSchema, returns: Filing, auth: JWT }
      - { method: GET,  path: /:id,            returns: Filing, auth: JWT }
      - { method: PUT,  path: /:id/status,     body: updateFilingStatusSchema, returns: Filing, auth: JWT }
      - { method: POST, path: /:id/approve,    returns: Filing, auth: JWT, role: founder }
      - { method: POST, path: /:id/reject,     body: "{ reason }", returns: Filing, auth: JWT, role: founder }
      - { method: POST, path: /:id/pause,      returns: Filing, auth: JWT }
      - { method: POST, path: /:id/escalate,   returns: Filing, auth: JWT }

  deadlines:
    base: /api/deadlines
    controller: deadlines.controller.ts
    endpoints:
      - { method: GET, path: /, returns: "Deadline[]", auth: JWT }

  documents:
    base: /api/documents
    controller: documents.controller.ts
    endpoints:
      - { method: GET,  path: /,          returns: "Document[]", auth: JWT }
      - { method: POST, path: /upload,    body: "multipart/form-data (file + entityId)", returns: Document, auth: JWT }
      - { method: PUT,  path: /:id/review, body: "{ status, notes }", returns: Document, auth: JWT }
    upload_config:
      allowed_types: [pdf, png, jpeg, csv, xlsx]
      max_size: 25MB
      storage: /uploads/<timestamp>-<random>.<ext>

  approvals:
    base: /api/approvals
    controller: approvals.controller.ts
    endpoints:
      - { method: GET,  path: /,              returns: "Approval[]", auth: JWT }
      - { method: POST, path: /:id/resolve,   body: "{ decision, notes }", returns: Approval, auth: JWT }
      - { method: POST, path: /:id/escalate,  body: "{ reason }", returns: Approval, auth: JWT }

  audit:
    base: /api/audit
    controller: audit.controller.ts
    endpoints:
      - { method: GET, path: /,       returns: "AuditLog[]", auth: JWT }
      - { method: GET, path: /export, returns: "text/csv", auth: JWT }

  agents:
    base: /api/agents
    controller: agents.controller.ts
    endpoints:
      - method: POST
        path: /intake/start
        body: { filingId }
        returns: { conversationId, message }
        auth: JWT
      - method: POST
        path: /intake/message
        body: { filingId, message, conversationId }
        returns: SSE stream
        auth: JWT
      - method: POST
        path: /deadline/run
        body: { entityId }
        returns: { message }
        auth: JWT
      - method: POST
        path: /document/extract
        body: { documentId }
        returns: { extractedData, tags }
        auth: JWT
      - method: POST
        path: /prefill/run
        body: { filingId }
        returns: { prefilledFields, summary }
        auth: JWT
      - method: POST
        path: /audit-risk/run
        body: { filingId }
        returns: { riskScore, flaggedItems }
        auth: JWT
      - method: POST
        path: /tax-qa/ask
        body: { question }
        returns: SSE stream
        auth: JWT
    sse_format: |
      data: {"text":"chunk"}\n\n
      data: [DONE]\n\n
```

---

## AI Agent System

```yaml
ai:
  provider: Google Generative AI
  model: gemini-2.5-flash
  base_class: BaseAgent (apps/api/src/agents/base.ts)
  features:
    - Streaming responses (SSE)
    - Vision API (PDF/image extraction via base64)
    - System instructions per agent
    - Auto audit logging with reasoning

  confidence_thresholds:
    review_trigger: 0.75  # Below this → CPA review queue
    mandatory_cpa: 60     # Audit risk score above this → mandatory CPA review

  agents:
    intake:
      file: agents/intake.ts
      purpose: Conversational filing data collection
      input: User messages (multi-turn chat)
      output: Structured intake data (SSE streamed)
      triggers: Filing status intake → ai_prep
      completion_marker: "INTAKE_COMPLETE:"

    deadline:
      file: agents/deadline.ts
      purpose: Tax deadline calculation
      input: Entity data (type, state, fiscal year)
      output: Calculated deadlines with urgency scores
      ai_call: false # Pure logic via deadlineEngine
      forms_supported:
        C-Corp: [1120, 5472, 5471, 7004]
        LLC: [1065, 7004]
        S-Corp: [1120-S, 7004]
      base_dates:
        "1065": March 15
        "1120-S": March 15
        "1120": April 15
        "5472": April 15

    document:
      file: agents/document.ts
      purpose: Extract structured data from uploaded files
      input: Document file (PDF/image via base64 vision)
      output: documentType, taxYear, fields with confidence
      escalation: Creates CPA approval if confidence < 0.75

    prefill:
      file: agents/prefill.ts
      purpose: Auto-fill tax form fields
      input: Entity data + intake responses + extracted documents
      output: Prefilled fields with source & reasoning per field
      triggers: Filing status → cpa_review
      flags: needsCpaReview per field

    auditRisk:
      file: agents/auditRisk.ts
      purpose: IRS audit risk assessment
      input: Filing data + entity profile
      output: Risk score (0-100) + flagged items with severity
      risk_levels:
        low: 0-30
        medium: 31-60
        high: 61-85
        critical: 86-100
      escalation: Score > 60 → mandatory CPA review

    taxQa:
      file: agents/taxQa.ts
      purpose: Real-time tax Q&A assistant
      input: User question
      output: Answer with confidence level + IRS citations (SSE streamed)
      confidence_levels: [HIGH, MEDIUM, LOW]
      escalation: requiresCpaReview flag auto-triggers

  hitl_gates:
    - AI cannot submit filings directly
    - AI cannot auto-approve anything
    - High risk (>60) triggers mandatory CPA review
    - Founder approval required before submission
    - All AI actions logged with reasoning & confidence to auditLog
```

---

## Frontend Architecture

```yaml
frontend:
  entry: apps/web/src/main.tsx
  shell: apps/web/src/app/Layout.tsx

  routing:
    library: React Router v7
    public_routes:
      - { path: /login, component: Login.tsx }
    protected_routes:
      - { path: /home,                component: Home.tsx }
      - { path: /filings,             component: Filings.tsx }
      - { path: /filings/:id,         component: FilingDetail.tsx }
      - { path: /entities/overview,    component: EntitiesOverview.tsx }
      - { path: /entities/:entityId,   component: EntityDetail.tsx }
      - { path: /deadlines,           component: Deadlines.tsx }
      - { path: /documents,           component: Documents.tsx }
      - { path: /approvals,           component: ApprovalQueue.tsx }
      - { path: /audit,               component: AuditTrail.tsx }
      - { path: /chat,                component: Chat.tsx }
      - { path: /estimated-tax,       component: EstimatedTax.tsx }
      - { path: /registrations,       component: Registrations.tsx }
      - { path: /rd-tax-credits,      component: RDTaxCredits.tsx }
      - { path: /action-centre,       component: ActionCentre.tsx }
      - { path: /incorporation,       component: Incorporation.tsx }
      - { path: /dissolution,         component: Dissolution.tsx }
      - { path: /address-book,        component: AddressBook.tsx }

  state_management:
    auth:
      library: Zustand
      store: stores/auth.ts
      persists_to: localStorage (key: taxos_token)
      state: [user, token, isLoading]
      actions: [login, logout, checkAuth]
    server_state:
      library: TanStack React Query
      purpose: API data fetching, caching, mutations

  api_client:
    file: lib/api.ts
    base_url: VITE_API_URL (proxied in dev)
    auth_header: "Authorization: Bearer <token>"
    sse_handling: ReadableStream reader with line-based parsing

  components:
    app_shell:
      - Sidebar.tsx     # Collapsible nav with logo, nav items, user profile
      - TopBar.tsx       # Header with Get Help + Inkle AI buttons
      - Layout.tsx       # Shell wrapper with sidebar + topbar + outlet
    icons:
      - icons.tsx        # LogoIcon, LogoFull, ChevronUpDown SVG components
    ui_library: shadcn/ui
      components:
        - Button, Card, Badge, Input, Dialog, Tabs
        - Select, Dropdown, Tooltip, Label, Textarea
    specialized:
      - StatusBadge.tsx      # Filing status color-coded badge
      - ConfidenceBadge.tsx  # AI confidence score visual indicator
      - InkleAIPanel.tsx     # Slide-over panel for AI features
      - GetHelpPanel.tsx     # Help overlay panel

  sidebar_navigation:
    main:
      - { icon: Home,          label: Home,           href: /home }
      - { icon: FileText,      label: Filings,        href: /filings }
      - { icon: Calculator,    label: Estimated Tax,   href: /estimated-tax }
      - { icon: MapPin,        label: Registrations,   href: /registrations, badge: Beta }
      - { icon: FlaskConical,  label: "R&D Tax Credits", href: /rd-tax-credits }
      - icon: Building2
        label: My Entities
        href: /entities
        children:
          - { label: Overview,      href: /entities/overview }
          - { label: Address Book,  href: /entities/address-book }
      - icon: MoreHorizontal
        label: Others
        href: /others
        children:
          - { label: Incorporation, href: /incorporation }
          - { label: Dissolution,   href: /dissolution }
          - { label: Approvals,     href: /approvals }
          - { label: Audit Trail,   href: /audit }
          - { label: Deadlines,     href: /deadlines }
    bottom:
      - { icon: MessageCircle, label: Chat,           href: /chat }
      - { icon: Zap,           label: Action Centre,  href: /action-centre }
      - { icon: FolderOpen,    label: Documents,      href: /documents }
```

---

## Environment Configuration

```yaml
env_vars:
  api:
    NODE_ENV: development | production
    PORT: 3001
    DATABASE_URL: ./taxos.db
    JWT_SECRET: "<min 32 chars>"
    GEMINI_API_KEY: "<google ai api key>"
  web:
    VITE_API_URL: http://localhost:3001/api

config_files:
  vite: apps/web/vite.config.ts
    - React plugin
    - Port 5173
    - Dev proxy: /api → http://localhost:3001
    - Path alias: @ → src/
  drizzle: apps/api/drizzle.config.ts
    - Schema: ./src/db/schema.ts
    - Dialect: sqlite
    - Output: ./src/db/migrations/
  typescript:
    api: ES2022 target, ESNext module
    web: ES2020 target, DOM libs, JSX react-jsx
```

---

## Development Commands

```yaml
commands:
  dev: pnpm dev              # Runs API + Web concurrently
  build: pnpm build          # Builds API (tsc) then Web (vite)
  db_migrate: pnpm db:migrate # Drizzle schema push
  db_seed: pnpm db:seed       # Populate demo data
```

---

## Key File Paths

```yaml
files:
  # API
  api_entry: apps/api/src/index.ts
  db_schema: apps/api/src/db/schema.ts
  db_seed: apps/api/src/db/seed.ts
  auth_middleware: apps/api/src/middleware/auth.ts
  error_middleware: apps/api/src/middleware/errorHandler.ts
  upload_middleware: apps/api/src/middleware/upload.ts
  agent_base: apps/api/src/agents/base.ts
  routes_dir: apps/api/src/routes/
  controllers_dir: apps/api/src/controllers/

  # Web
  web_entry: apps/web/src/main.tsx
  app_shell: apps/web/src/app/
  pages_dir: apps/web/src/pages/
  components_dir: apps/web/src/components/
  api_client: apps/web/src/lib/api.ts
  auth_store: apps/web/src/stores/auth.ts

  # Shared
  shared_entry: packages/shared/index.ts
  schemas_dir: packages/shared/schemas/

  # Unused pages (defined but not routed)
  unused:
    - apps/web/src/pages/CommandCenter.tsx
```

---

## Filing Workflow Diagram

```
User creates filing
       │
       ▼
   ┌────────┐     AI Intake Agent
   │ intake  │ ──── (multi-turn chat) ────┐
   └────────┘                             │
       │                                  │
       ▼                                  │
   ┌────────┐     Prefill + Doc Extract   │
   │ ai_prep │ ◄──────────────────────────┘
   └────────┘
       │
       ▼
   ┌───────────┐   CPA reviews prefilled
   │ cpa_review │   fields + risk score
   └───────────┘
       │
       ▼
   ┌──────────────────┐   Founder approves
   │ founder_approval  │   or rejects
   └──────────────────┘
       │
       ▼
   ┌───────────┐
   │ submitted  │   Filed with IRS
   └───────────┘
       │
       ▼
   ┌──────────┐
   │ archived  │   Completed
   └──────────┘
```
