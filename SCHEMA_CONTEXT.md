# TaxOS Database Schema — Context Document

> **ORM**: Drizzle ORM | **Database**: SQLite (better-sqlite3) | **File**: `apps/api/src/db/schema.ts`

---

## Entity Relationship Diagram

```
organizations ─┬── users
               ├── entities ──── deadlines
               ├── filings ─┬── documents
               │             ├── approvalQueue
               │             ├── auditLog
               │             └── agentConversations
               └── auditLog
```

```
┌──────────────────┐       ┌──────────────────┐
│  organizations   │◄──────│      users       │
│                  │  orgId │                  │
└────────┬─────────┘       └──────────────────┘
         │                          │
         │ orgId                    │ userId (cpaAssignedId,
         ▼                          │  uploadedById, resolvedById)
┌──────────────────┐                │
│    entities      │                │
└────────┬─────────┘                │
         │ entityId                 │
         ▼                          │
┌──────────────────┐                │
│   deadlines      │                │
└────────┬─────────┘                │
         │ deadlineId               │
         ▼                          │
┌──────────────────┐       ┌────────┴─────────┐
│    filings       │◄──────│   documents      │
│                  │filingId│                  │
│                  │◄──────│ approvalQueue    │
│                  │◄──────│ auditLog         │
│                  │◄──────│ agentConversations│
└──────────────────┘       └──────────────────┘
```

---

## 1. organizations

The top-level tenant. All data is scoped to an organization for multi-tenancy.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique org identifier | `"a1b2c3d4-..."` |
| `name` | `text` | NOT NULL | Organization/company name | `"Acme Inc"` |
| `plan` | `text` (enum) | NOT NULL, default `"free"` | Subscription tier: `free`, `starter`, `pro` | `"starter"` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | Timestamp of creation | `"2026-04-07T10:00:00"` |

**Referenced by**: `users.orgId`, `entities.orgId`, `filings.orgId`, `documents.orgId`, `approvalQueue.orgId`, `auditLog.orgId`, `agentConversations.orgId`

```json
{
  "id": "org_a1b2c3d4-5678-9abc-def0-1234567890ab",
  "name": "Acme Inc",
  "plan": "starter",
  "createdAt": "2026-01-15T08:30:00.000Z"
}
```

---

## 2. users

People who log in. Every user belongs to exactly one organization.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique user identifier | `"u_abc123..."` |
| `orgId` | `text` | FK → `organizations.id`, NOT NULL | The org this user belongs to | `"org_a1b2..."` |
| `email` | `text` | UNIQUE, NOT NULL | Login email | `"john@acme.com"` |
| `passwordHash` | `text` | NOT NULL | bcrypt-hashed password | `"$2b$10$..."` |
| `name` | `text` | NOT NULL | Display name | `"John Doe"` |
| `role` | `text` (enum) | NOT NULL, default `"founder"` | `founder`, `team_member`, `cpa`, `admin` | `"founder"` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | When the user was created | `"2026-01-15T08:30:00"` |

**References**: `organizations.id` via `orgId`
**Referenced by**: `filings.cpaAssignedId`, `documents.uploadedById`, `approvalQueue.resolvedById`

**Role behavior**:
- `founder` — can approve/reject filings, full access to own org
- `team_member` — standard access, cannot approve filings
- `cpa` — can review filings, advance to `founder_approval`, escalate
- `admin` — full administrative access

```json
{
  "id": "u_d4e5f6a7-...",
  "orgId": "org_a1b2c3d4-...",
  "email": "demo@taxos.ai",
  "passwordHash": "$2b$10$abcdef...",
  "name": "Demo User",
  "role": "founder",
  "createdAt": "2026-01-15T08:30:00.000Z"
}
```

---

## 3. entities

A legal business entity (company) that files taxes. An org can have multiple entities.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique entity identifier | `"ent_123..."` |
| `orgId` | `text` | FK → `organizations.id`, NOT NULL | Owning organization | `"org_a1b2..."` |
| `legalName` | `text` | NOT NULL | Full legal name | `"Acme Corporation"` |
| `entityType` | `text` (enum) | NOT NULL | `C-Corp`, `LLC`, `S-Corp`, `Pvt-Ltd` | `"C-Corp"` |
| `stateOfIncorporation` | `text` | NOT NULL | US state or jurisdiction | `"Delaware"` |
| `ein` | `text` | nullable | IRS Employer ID Number (XX-XXXXXXX) | `"12-3456789"` |
| `fiscalYearEnd` | `text` | NOT NULL, default `"12-31"` | Month-day of fiscal year end (MM-DD) | `"12-31"` |
| `foreignSubsidiaries` | `json` (string[]) | default `[]` | List of foreign subsidiary names | `["Acme UK Ltd"]` |
| `country` | `text` | NOT NULL, default `"US"` | Country of incorporation (ISO code) | `"US"` |
| `status` | `text` (enum) | NOT NULL, default `"active"` | `active`, `inactive`, `dissolved` | `"active"` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | Creation timestamp | `"2026-01-15T08:30:00"` |

**References**: `organizations.id` via `orgId`
**Referenced by**: `deadlines.entityId`, `filings.entityId`

**Notes**:
- `entityType` determines which tax forms are required (e.g., C-Corp → Form 1120)
- `fiscalYearEnd` drives deadline calculations (non-calendar year entities have different due dates)
- `foreignSubsidiaries` triggers additional filings (Form 5471)
- Deleting sets `status = "dissolved"` (soft delete)

```json
{
  "id": "ent_b2c3d4e5-...",
  "orgId": "org_a1b2c3d4-...",
  "legalName": "Acme Corporation",
  "entityType": "C-Corp",
  "stateOfIncorporation": "Delaware",
  "ein": "12-3456789",
  "fiscalYearEnd": "12-31",
  "foreignSubsidiaries": ["Acme UK Ltd"],
  "country": "US",
  "status": "active",
  "createdAt": "2026-01-20T14:00:00.000Z"
}
```

---

## 4. deadlines

Tax filing deadlines calculated per entity. Can be AI-predicted or manually set.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique deadline identifier | `"dl_456..."` |
| `entityId` | `text` | FK → `entities.id`, NOT NULL | The entity this deadline belongs to | `"ent_b2c3..."` |
| `formType` | `text` | NOT NULL | IRS form number | `"1120"` |
| `formName` | `text` | NOT NULL | Human-readable form name | `"U.S. Corporation Income Tax Return"` |
| `dueDate` | `text` (ISO) | NOT NULL | Filing deadline date | `"2026-04-15"` |
| `status` | `text` (enum) | NOT NULL, default `"upcoming"` | `upcoming`, `overdue`, `filed`, `extended` | `"upcoming"` |
| `aiPredicted` | `integer` (bool) | default `true` | Whether the deadline was AI-calculated | `1` (true) |
| `urgencyScore` | `integer` | default `0` | 0–100, higher = more urgent | `85` |
| `description` | `text` | nullable | Additional context | `"Extended via Form 7004"` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | Creation timestamp | `"2026-01-20T14:00:00"` |

**References**: `entities.id` via `entityId`
**Referenced by**: `filings.deadlineId`

**Connected fields**:
- `entityId` → determines which entity this deadline applies to
- `formType` + `formName` → matches the filing it triggers
- `urgencyScore` → drives the "Needs Attention" urgency strip on the Command Center

```json
{
  "id": "dl_c3d4e5f6-...",
  "entityId": "ent_b2c3d4e5-...",
  "formType": "1120",
  "formName": "U.S. Corporation Income Tax Return",
  "dueDate": "2026-04-15",
  "status": "upcoming",
  "aiPredicted": true,
  "urgencyScore": 75,
  "description": null,
  "createdAt": "2026-01-20T14:00:00.000Z"
}
```

---

## 5. filings

The core record — a tax filing being prepared, reviewed, and submitted. This is the central table with the most relationships.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique filing identifier | `"fil_789..."` |
| `entityId` | `text` | FK → `entities.id`, NOT NULL | Which entity is filing | `"ent_b2c3..."` |
| `deadlineId` | `text` | FK → `deadlines.id`, nullable | Linked deadline (if any) | `"dl_c3d4..."` |
| `orgId` | `text` | FK → `organizations.id`, NOT NULL | Owning organization | `"org_a1b2..."` |
| `formType` | `text` | NOT NULL | IRS form number | `"1120"` |
| `formName` | `text` | NOT NULL | Human-readable form name | `"U.S. Corporation Income Tax Return"` |
| `status` | `text` (enum) | NOT NULL, default `"intake"` | Filing workflow status (see below) | `"cpa_review"` |
| `aiConfidenceScore` | `real` | nullable | 0.0–1.0, AI's confidence in prefilled data | `0.87` |
| `cpaAssignedId` | `text` | FK → `users.id`, nullable | CPA user assigned to review | `"u_d4e5..."` |
| `filingData` | `json` (object) | default `{}` | The actual form field values | `{"grossReceipts": "500000"}` |
| `aiSummary` | `text` | nullable | AI-generated plain-English summary | `"C-Corp with $500k revenue..."` |
| `aiReasoning` | `text` | nullable | AI's reasoning for its prefill choices | `"Used W-2 data to determine..."` |
| `founderApprovedAt` | `text` (ISO) | nullable | When the founder approved | `"2026-03-20T16:00:00"` |
| `submittedAt` | `text` (ISO) | nullable | When filing was submitted | `"2026-03-21T09:00:00"` |
| `taxYear` | `integer` | nullable | Tax year this filing covers | `2025` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | Creation timestamp | `"2026-02-01T10:00:00"` |
| `updatedAt` | `text` (ISO) | NOT NULL, auto | Last modification timestamp | `"2026-03-15T14:30:00"` |

**References**: `entities.id`, `deadlines.id`, `organizations.id`, `users.id`
**Referenced by**: `documents.filingId`, `approvalQueue.filingId`, `auditLog.filingId`, `agentConversations.filingId`

### Status Workflow

```
intake → ai_prep → cpa_review → founder_approval → submitted → archived

intake            User created the filing, collecting initial info
ai_prep           AI agents are extracting docs, prefilling form fields
cpa_review        CPA is reviewing AI-prefilled data
founder_approval  Waiting for founder to approve before submission
submitted         Filing has been submitted to the IRS
archived          Filing is closed/historical
```

**HITL Gates**:
- Only a CPA can advance from `cpa_review` → `founder_approval`
- Only a founder can advance from `founder_approval` → `submitted` (via approve endpoint)
- Rejection sends status back to `cpa_review`

```json
{
  "id": "fil_e5f6a7b8-...",
  "entityId": "ent_b2c3d4e5-...",
  "deadlineId": "dl_c3d4e5f6-...",
  "orgId": "org_a1b2c3d4-...",
  "formType": "1120",
  "formName": "U.S. Corporation Income Tax Return",
  "status": "cpa_review",
  "aiConfidenceScore": 0.87,
  "cpaAssignedId": null,
  "filingData": {
    "grossReceipts": { "value": "500000", "confidence": 0.92, "source": "W-2 extraction" },
    "totalDeductions": { "value": "120000", "confidence": 0.85, "source": "intake interview" },
    "officerCompensation": { "value": "150000", "confidence": 0.90, "source": "W-2 extraction" }
  },
  "aiSummary": "C-Corp with $500k gross receipts, $120k deductions. Officer compensation $150k.",
  "aiReasoning": "Prefilled from W-2 extraction and intake interview responses.",
  "founderApprovedAt": null,
  "submittedAt": null,
  "taxYear": 2025,
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-03-15T14:30:00.000Z"
}
```

---

## 6. documents

Uploaded files (PDFs, images, spreadsheets) attached to a filing. AI extracts structured data from them.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique document identifier | `"doc_abc..."` |
| `filingId` | `text` | FK → `filings.id`, nullable | Filing this doc is attached to | `"fil_e5f6..."` |
| `orgId` | `text` | FK → `organizations.id`, NOT NULL | Owning organization | `"org_a1b2..."` |
| `fileName` | `text` | NOT NULL | Original uploaded filename | `"w2-2025.pdf"` |
| `storageUrl` | `text` | NOT NULL | Path to file on disk | `"/uploads/1712345678-w2.pdf"` |
| `mimeType` | `text` | NOT NULL | File MIME type | `"application/pdf"` |
| `extractedData` | `json` (object) | nullable | AI-extracted structured data | see below |
| `aiTags` | `json` (string[]) | default `[]` | AI-assigned document type tags | `["W-2"]` |
| `confidenceScore` | `real` | nullable | 0.0–1.0, extraction confidence | `0.92` |
| `reviewedByHuman` | `integer` (bool) | default `false` | Whether a human has verified extraction | `0` (false) |
| `uploadedById` | `text` | FK → `users.id`, NOT NULL | User who uploaded | `"u_d4e5..."` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | Upload timestamp | `"2026-02-05T11:00:00"` |

**References**: `filings.id`, `organizations.id`, `users.id`

**Connected fields**:
- `filingId` → links document to a specific filing (nullable = org-level doc not tied to a filing)
- `extractedData` → fed into the PrefillAgent to auto-fill form fields
- `confidenceScore < 0.75` → triggers a CPA review item in `approvalQueue`

**extractedData example** (set by DocumentAgent):
```json
{
  "documentType": "W-2",
  "taxYear": 2025,
  "fields": {
    "employerName": { "value": "Acme Inc", "confidence": 0.95 },
    "wages": { "value": "150000", "confidence": 0.92 },
    "federalTaxWithheld": { "value": "35000", "confidence": 0.90 }
  },
  "overallConfidence": 0.92,
  "flaggedIssues": [],
  "reasoning": "Standard W-2 extraction"
}
```

```json
{
  "id": "doc_f6a7b8c9-...",
  "filingId": "fil_e5f6a7b8-...",
  "orgId": "org_a1b2c3d4-...",
  "fileName": "w2-2025.pdf",
  "storageUrl": "/uploads/1712345678-abc123-w2-2025.pdf",
  "mimeType": "application/pdf",
  "extractedData": { "documentType": "W-2", "taxYear": 2025, "fields": {}, "overallConfidence": 0.92 },
  "aiTags": ["W-2"],
  "confidenceScore": 0.92,
  "reviewedByHuman": false,
  "uploadedById": "u_d4e5f6a7-...",
  "createdAt": "2026-02-05T11:00:00.000Z"
}
```

---

## 7. approvalQueue

Human-in-the-loop (HITL) approval items. Created when AI confidence is low or a filing needs sign-off.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique approval item ID | `"appr_123..."` |
| `orgId` | `text` | FK → `organizations.id`, NOT NULL | Owning organization | `"org_a1b2..."` |
| `filingId` | `text` | FK → `filings.id`, NOT NULL | Related filing | `"fil_e5f6..."` |
| `queueType` | `text` (enum) | NOT NULL | `founder` or `cpa` — who needs to act | `"cpa"` |
| `status` | `text` (enum) | NOT NULL, default `"pending"` | `pending`, `approved`, `rejected`, `escalated` | `"pending"` |
| `summary` | `text` | NOT NULL | Human-readable description of what needs review | see below |
| `aiRecommendation` | `text` | nullable | AI's suggested action | `"Approve — all fields above 85% confidence"` |
| `rejectionReason` | `text` | nullable | Why it was rejected (if rejected) | `"Line 12 numbers don't match W-2"` |
| `resolvedAt` | `text` (ISO) | nullable | When it was resolved | `"2026-03-18T10:00:00"` |
| `resolvedById` | `text` | FK → `users.id`, nullable | Who resolved it | `"u_d4e5..."` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | When the queue item was created | `"2026-03-15T14:30:00"` |

**References**: `organizations.id`, `filings.id`, `users.id`

**When items are created**:
- PrefillAgent: `overallConfidence < 0.8` or any field has `needsCpaReview: true` → `queueType: "cpa"`
- DocumentAgent: `overallConfidence < 0.75` → `queueType: "cpa"`
- AuditRiskAgent: `overallRiskScore > 60` → `queueType: "cpa"` (mandatory)
- Filing reaches `founder_approval` → `queueType: "founder"`

**Status transitions**:
```
pending → approved    (resolved by human)
pending → rejected    (resolved by human, reason required)
pending → escalated   (sent from founder queue to CPA)
```

```json
{
  "id": "appr_a7b8c9d0-...",
  "orgId": "org_a1b2c3d4-...",
  "filingId": "fil_e5f6a7b8-...",
  "queueType": "cpa",
  "status": "pending",
  "summary": "Form 1120 prefill complete (confidence: 87%). Fields flagged for CPA review.",
  "aiRecommendation": "Review officer compensation field — value differs from prior year by 40%.",
  "rejectionReason": null,
  "resolvedAt": null,
  "resolvedById": null,
  "createdAt": "2026-03-15T14:30:00.000Z"
}
```

---

## 8. auditLog

Immutable log of every significant action. Used for compliance, debugging, and accountability.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique log entry ID | `"log_123..."` |
| `orgId` | `text` | FK → `organizations.id`, NOT NULL | Organization scope | `"org_a1b2..."` |
| `filingId` | `text` | FK → `filings.id`, nullable | Related filing (if any) | `"fil_e5f6..."` |
| `actorType` | `text` (enum) | NOT NULL | Who performed the action: `ai`, `cpa`, `founder`, `system` | `"ai"` |
| `actorId` | `text` | nullable | Specific actor identifier | `"agent:PrefillAgent"` or `"u_d4e5..."` |
| `action` | `text` | NOT NULL | Machine-readable action name | `"form_prefilled"` |
| `reasoning` | `text` | nullable | Explanation (especially for AI actions) | `"Prefilled from W-2 and intake data"` |
| `inputs` | `json` (object) | nullable | What was fed into the action | `{"question": "When is 1120 due?"}` |
| `outputs` | `json` (object) | nullable | What the action produced | `{"fieldCount": 5}` |
| `modelVersion` | `text` | nullable | AI model used (null for human actions) | `"gemini-2.0-flash"` |
| `confidenceScore` | `real` | nullable | 0.0–1.0 for AI actions | `0.87` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | When it happened | `"2026-03-15T14:30:00"` |

**References**: `organizations.id`, `filings.id`

**Common action values**:
| Action | Actor | Description |
|---|---|---|
| `entity_created` | system | New entity added |
| `filing_created` | system | New filing created |
| `intake_started` | ai | AI intake conversation began |
| `intake_completed` | ai | All intake info collected |
| `document_extracted` | ai | AI extracted data from a document |
| `form_prefilled` | ai | AI prefilled form fields |
| `risk_scored` | ai | Audit risk assessment completed |
| `tax_qa_answered` | ai | AI answered a tax question |
| `status_changed` | system | Filing status was updated |
| `founder_approved` | founder | Founder approved the filing |
| `founder_rejected` | founder | Founder rejected with reason |
| `workflow_paused` | founder/cpa | Filing workflow paused |
| `escalated_to_cpa` | system | Escalated from AI/founder to CPA |
| `approval_resolved` | cpa/founder | Approval queue item resolved |

```json
{
  "id": "log_b8c9d0e1-...",
  "orgId": "org_a1b2c3d4-...",
  "filingId": "fil_e5f6a7b8-...",
  "actorType": "ai",
  "actorId": "agent:PrefillAgent",
  "action": "form_prefilled",
  "reasoning": "Prefilled Form 1120 using W-2 extraction and intake interview responses.",
  "inputs": null,
  "outputs": { "fieldCount": 5 },
  "modelVersion": "gemini-2.0-flash",
  "confidenceScore": 0.87,
  "createdAt": "2026-03-15T14:30:00.000Z"
}
```

---

## 9. agentConversations

Tracks multi-turn AI chat sessions (intake interviews, Q&A). Each conversation belongs to a filing.

| Field | Type | Constraints | Description | Example |
|---|---|---|---|---|
| `id` | `text` (UUID) | PK, auto-generated | Unique conversation ID | `"conv_123..."` |
| `filingId` | `text` | FK → `filings.id`, nullable | Related filing | `"fil_e5f6..."` |
| `orgId` | `text` | FK → `organizations.id`, NOT NULL | Organization scope | `"org_a1b2..."` |
| `agentType` | `text` | NOT NULL | Which agent runs this conversation | `"intake"` |
| `messages` | `json` (array) | default `[]` | Full conversation history | see below |
| `status` | `text` (enum) | NOT NULL, default `"active"` | `active`, `completed`, `escalated` | `"active"` |
| `createdAt` | `text` (ISO) | NOT NULL, auto | When conversation started | `"2026-02-01T10:00:00"` |
| `updatedAt` | `text` (ISO) | NOT NULL, auto | Last message timestamp | `"2026-02-01T10:15:00"` |

**References**: `filings.id`, `organizations.id`

**agentType values**: `"intake"` (intake interview), `"tax_qa"` (general Q&A)

**messages format**:
```json
[
  {
    "role": "assistant",
    "content": "Hi! Let's get started with your Form 1120 filing. First, what was your company's gross receipts for 2025?",
    "timestamp": "2026-02-01T10:00:00.000Z"
  },
  {
    "role": "user",
    "content": "About $500,000",
    "timestamp": "2026-02-01T10:02:00.000Z"
  },
  {
    "role": "assistant",
    "content": "Got it — $500,000 in gross receipts. Now, what were your total business deductions?",
    "timestamp": "2026-02-01T10:02:05.000Z"
  }
]
```

**Completion**: When the AI detects all required fields are collected, it outputs `INTAKE_COMPLETE:` followed by a JSON block. The conversation `status` changes to `"completed"`.

```json
{
  "id": "conv_d0e1f2a3-...",
  "filingId": "fil_e5f6a7b8-...",
  "orgId": "org_a1b2c3d4-...",
  "agentType": "intake",
  "messages": [
    { "role": "assistant", "content": "Hi! Let's start...", "timestamp": "2026-02-01T10:00:00.000Z" },
    { "role": "user", "content": "About $500k", "timestamp": "2026-02-01T10:02:00.000Z" }
  ],
  "status": "active",
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-01T10:02:05.000Z"
}
```

---

## Cross-Table Data Flow

This shows how data flows through the system during a typical filing lifecycle:

```
1. User creates an ENTITY (entities)
   └─► DeadlineAgent auto-creates DEADLINES (deadlines)

2. User creates a FILING (filings) linked to entity + deadline
   └─► Status: "intake"

3. IntakeAgent starts a CONVERSATION (agentConversations)
   └─► Collects info via chat, stores in messages[]
   └─► Status: "ai_prep"

4. User uploads DOCUMENTS (documents)
   └─► DocumentAgent extracts data → extractedData, aiTags, confidenceScore
   └─► Low confidence → creates APPROVAL item (approvalQueue, queueType: "cpa")

5. PrefillAgent prefills FILING (filings.filingData)
   └─► Uses: entity data + intake messages + extracted documents
   └─► Sets: aiConfidenceScore, aiSummary, aiReasoning
   └─► Status: "cpa_review"
   └─► Low confidence → creates APPROVAL item (approvalQueue)

6. AuditRiskAgent scores the FILING
   └─► High risk (>60) → creates mandatory APPROVAL item (approvalQueue)

7. CPA reviews and advances → Status: "founder_approval"

8. Founder approves → Status: "submitted"
   └─► Sets: founderApprovedAt, submittedAt

Every step above logs to AUDIT LOG (auditLog) with actor, action, reasoning, and confidence.
```

---

## Key Constraints & Business Rules

| Rule | Enforced By |
|---|---|
| All queries scoped to `orgId` | API middleware (req.user.orgId) |
| Filing status transitions are ordered | `PUT /filings/:id/status` validates transitions |
| Only CPA can advance to `founder_approval` | `POST /filings/:id/status` role check |
| Only founder can approve/submit | `POST /filings/:id/approve` role check |
| Rejection returns to `cpa_review` | `POST /filings/:id/reject` handler |
| AI confidence < 0.75 triggers CPA review | DocumentAgent, PrefillAgent logic |
| Audit risk > 60 triggers mandatory CPA review | AuditRiskAgent logic |
| Audit log is immutable (insert-only) | No UPDATE/DELETE routes for audit |
| Entity delete is soft (status → dissolved) | `DELETE /entities/:id` handler |
