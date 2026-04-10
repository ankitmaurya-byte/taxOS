# API Documentation

> **Base URL**: `http://localhost:3001/api`
> **Auth**: JWT Bearer token in `Authorization` header (unless noted)
> **Content-Type**: `application/json` (except file uploads: `multipart/form-data`)

---

## Health Check

```yaml
endpoint: /api/health
method: GET
auth: false
description: Health check
response:
  status: 200
  body:
    status: "ok"
    timestamp: "2026-04-07T00:00:00.000Z"
```

```bash
curl http://localhost:3001/api/health
```

---

## Auth

### Register

```yaml
endpoint: /api/auth/register
method: POST
auth: false
request:
  body:
    email: string       # required
    password: string    # required, min 6 chars
    name: string        # required
    orgName: string     # required
response:
  status: 201
  body:
    token: string       # JWT token (expires 7d)
    user:
      id: string
      email: string
      name: string
      role: "founder"
      orgId: string
```

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secret123",
    "name": "John Doe",
    "orgName": "Acme Inc"
  }'
```

### Login

```yaml
endpoint: /api/auth/login
method: POST
auth: false
request:
  body:
    email: string       # required
    password: string    # required
response:
  status: 200
  body:
    token: string
    user:
      id: string
      email: string
      name: string
      role: "founder | team_member | cpa | admin"
      orgId: string
```

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secret123"
  }'
```

### Get Current User

```yaml
endpoint: /api/auth/me
method: GET
auth: true
response:
  status: 200
  body:
    id: string
    email: string
    name: string
    role: "founder | team_member | cpa | admin"
    orgId: string
```

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## Entities

### List Entities

```yaml
endpoint: /api/entities
method: GET
auth: true
description: List all entities for the organization
response:
  status: 200
  body: Entity[]
```

```bash
curl http://localhost:3001/api/entities \
  -H "Authorization: Bearer <token>"
```

### Create Entity

```yaml
endpoint: /api/entities
method: POST
auth: true
description: Create entity and auto-calculate tax deadlines
request:
  body:
    legalName: string               # required
    entityType: string              # required — C-Corp | LLC | S-Corp | Pvt-Ltd
    stateOfIncorporation: string    # required
    ein: string                     # optional — format XX-XXXXXXX
    fiscalYearEnd: string           # optional — MM-DD, default 12-31
    foreignSubsidiaries: string[]   # optional
    country: string                 # optional — default US
response:
  status: 201
  body:
    id: string
    orgId: string
    legalName: string
    entityType: string
    stateOfIncorporation: string
    ein: string
    fiscalYearEnd: string
    foreignSubsidiaries: string[]
    country: string
    status: "active"
    createdAt: string
```

```bash
curl -X POST http://localhost:3001/api/entities \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "Acme Corp",
    "entityType": "C-Corp",
    "stateOfIncorporation": "Delaware",
    "ein": "12-3456789",
    "fiscalYearEnd": "12-31",
    "country": "US"
  }'
```

### Get Entity

```yaml
endpoint: /api/entities/:id
method: GET
auth: true
response:
  status: 200
  body: Entity
```

```bash
curl http://localhost:3001/api/entities/<entity-id> \
  -H "Authorization: Bearer <token>"
```

### Update Entity

```yaml
endpoint: /api/entities/:id
method: PUT
auth: true
request:
  body:  # all fields optional (partial update)
    legalName: string
    entityType: string
    stateOfIncorporation: string
    ein: string
    fiscalYearEnd: string
    foreignSubsidiaries: string[]
    country: string
response:
  status: 200
  body: Entity
```

```bash
curl -X PUT http://localhost:3001/api/entities/<entity-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "Acme Corp Updated"
  }'
```

### Delete Entity (Soft Delete)

```yaml
endpoint: /api/entities/:id
method: DELETE
auth: true
description: Marks entity as dissolved (soft delete)
response:
  status: 200
  body:
    message: string
```

```bash
curl -X DELETE http://localhost:3001/api/entities/<entity-id> \
  -H "Authorization: Bearer <token>"
```

---

## Filings

### List Filings

```yaml
endpoint: /api/filings
method: GET
auth: true
query_params:
  status: string     # optional — filter by filing status
  entityId: string   # optional — filter by entity
  year: number       # optional — filter by tax year
response:
  status: 200
  body: Filing[]
```

```bash
curl "http://localhost:3001/api/filings?status=intake&entityId=<id>&year=2025" \
  -H "Authorization: Bearer <token>"
```

### Create Filing

```yaml
endpoint: /api/filings
method: POST
auth: true
request:
  body:
    entityId: string    # required
    formType: string    # required
    formName: string    # required
    deadlineId: string  # optional
    taxYear: number     # optional
response:
  status: 201
  body: Filing          # status defaults to "intake"
```

```bash
curl -X POST http://localhost:3001/api/filings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "<entity-id>",
    "formType": "1120",
    "formName": "U.S. Corporation Income Tax Return",
    "taxYear": 2025
  }'
```

### Get Filing

```yaml
endpoint: /api/filings/:id
method: GET
auth: true
description: Returns filing with related conversations, documents, and approvals
response:
  status: 200
  body:
    filing: Filing
    conversations: AgentConversation[]
    documents: Document[]
    approvals: ApprovalQueue[]
```

```bash
curl http://localhost:3001/api/filings/<filing-id> \
  -H "Authorization: Bearer <token>"
```

### Update Filing Status

```yaml
endpoint: /api/filings/:id/status
method: PUT
auth: true
description: |
  Validates status transitions:
  intake → ai_prep → cpa_review → founder_approval → submitted → archived
request:
  body:
    status: string   # required — intake | ai_prep | cpa_review | founder_approval | submitted | archived
response:
  status: 200
  body:
    message: string
```

```bash
curl -X PUT http://localhost:3001/api/filings/<filing-id>/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "ai_prep"}'
```

### Approve Filing (Founder)

```yaml
endpoint: /api/filings/:id/approve
method: POST
auth: true
description: Founder approves and submits filing
response:
  status: 200
  body:
    message: string
```

```bash
curl -X POST http://localhost:3001/api/filings/<filing-id>/approve \
  -H "Authorization: Bearer <token>"
```

### Reject Filing (Founder)

```yaml
endpoint: /api/filings/:id/reject
method: POST
auth: true
request:
  body:
    reason: string   # required
response:
  status: 200
  body:
    message: string
```

```bash
curl -X POST http://localhost:3001/api/filings/<filing-id>/reject \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Numbers on line 12 look incorrect"}'
```

### Pause Filing

```yaml
endpoint: /api/filings/:id/pause
method: POST
auth: true
description: Pause the AI workflow
response:
  status: 200
  body:
    message: string
```

```bash
curl -X POST http://localhost:3001/api/filings/<filing-id>/pause \
  -H "Authorization: Bearer <token>"
```

### Escalate to CPA

```yaml
endpoint: /api/filings/:id/escalate-cpa
method: POST
auth: true
description: Escalate filing for CPA takeover
response:
  status: 200
  body:
    message: string
```

```bash
curl -X POST http://localhost:3001/api/filings/<filing-id>/escalate-cpa \
  -H "Authorization: Bearer <token>"
```

---

## Deadlines

### List Deadlines

```yaml
endpoint: /api/deadlines
method: GET
auth: true
query_params:
  entityId: string   # optional
response:
  status: 200
  body: Deadline[]
```

```bash
curl "http://localhost:3001/api/deadlines?entityId=<id>" \
  -H "Authorization: Bearer <token>"
```

### Get Deadline

```yaml
endpoint: /api/deadlines/:id
method: GET
auth: true
response:
  status: 200
  body:
    id: string
    entityId: string
    formType: string
    formName: string
    dueDate: string          # ISO date
    status: string           # upcoming | overdue | filed | extended
    aiPredicted: boolean
    urgencyScore: number
    description: string
    createdAt: string
```

```bash
curl http://localhost:3001/api/deadlines/<deadline-id> \
  -H "Authorization: Bearer <token>"
```

---

## Documents

### List Documents

```yaml
endpoint: /api/documents
method: GET
auth: true
query_params:
  filingId: string       # optional
  reviewStatus: string   # optional
response:
  status: 200
  body: Document[]
```

```bash
curl "http://localhost:3001/api/documents?filingId=<id>" \
  -H "Authorization: Bearer <token>"
```

### Upload Document

```yaml
endpoint: /api/documents/upload
method: POST
auth: true
content_type: multipart/form-data
request:
  form_data:
    file: binary         # required — max 25MB
    filingId: string     # optional
  allowed_types:
    - application/pdf
    - image/png
    - image/jpeg
    - text/csv
    - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
response:
  status: 201
  body: Document
```

```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/document.pdf" \
  -F "filingId=<filing-id>"
```

### Get Document

```yaml
endpoint: /api/documents/:id
method: GET
auth: true
response:
  status: 200
  body: Document
```

```bash
curl http://localhost:3001/api/documents/<document-id> \
  -H "Authorization: Bearer <token>"
```

### Mark Document as Reviewed

```yaml
endpoint: /api/documents/:id/review
method: PUT
auth: true
description: Mark document as human-reviewed
response:
  status: 200
  body:
    message: string
```

```bash
curl -X PUT http://localhost:3001/api/documents/<document-id>/review \
  -H "Authorization: Bearer <token>"
```

---

## Approvals

### List Approvals

```yaml
endpoint: /api/approvals
method: GET
auth: true
description: Returns approvals filtered by user role
response:
  status: 200
  body: ApprovalQueue[]
```

```bash
curl http://localhost:3001/api/approvals \
  -H "Authorization: Bearer <token>"
```

### Resolve Approval

```yaml
endpoint: /api/approvals/:id/resolve
method: POST
auth: true
request:
  body:
    status: string    # required — approved | rejected
    reason: string    # optional
response:
  status: 200
  body:
    message: string
```

```bash
curl -X POST http://localhost:3001/api/approvals/<approval-id>/resolve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### Escalate Approval

```yaml
endpoint: /api/approvals/:id/escalate
method: POST
auth: true
description: Escalate approval item to CPA
response:
  status: 200
  body:
    message: string
```

```bash
curl -X POST http://localhost:3001/api/approvals/<approval-id>/escalate \
  -H "Authorization: Bearer <token>"
```

---

## Audit Logs

### List Audit Logs

```yaml
endpoint: /api/audit
method: GET
auth: true
description: Organization-scoped, sorted descending by createdAt
query_params:
  filingId: string    # optional
  actorType: string   # optional — ai | cpa | founder | system
  from: string        # optional — ISO date
  to: string          # optional — ISO date
response:
  status: 200
  body:
    - id: string
      orgId: string
      filingId: string
      actorType: "ai | cpa | founder | system"
      actorId: string
      action: string
      reasoning: string
      inputs: object
      outputs: object
      modelVersion: string
      confidenceScore: number
      createdAt: string
```

```bash
curl "http://localhost:3001/api/audit?filingId=<id>&actorType=ai&from=2025-01-01&to=2025-12-31" \
  -H "Authorization: Bearer <token>"
```

### Export Audit Logs (CSV)

```yaml
endpoint: /api/audit/export
method: GET
auth: true
query_params:
  filingId: string   # optional
response:
  status: 200
  content_type: text/csv
  body: CSV file download
```

```bash
curl "http://localhost:3001/api/audit/export?filingId=<id>" \
  -H "Authorization: Bearer <token>" \
  -o audit_trail.csv
```

---

## AI Agents

### Start Intake Conversation

```yaml
endpoint: /api/agents/intake/start
method: POST
auth: true
request:
  body:
    filingId: string   # required
response:
  status: 200
  body: object         # initial agent result
```

```bash
curl -X POST http://localhost:3001/api/agents/intake/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"filingId": "<filing-id>"}'
```

### Send Intake Message (SSE Stream)

```yaml
endpoint: /api/agents/intake/message
method: POST
auth: true
description: Returns Server-Sent Events stream
request:
  body:
    filingId: string   # required
    message: string    # required
response:
  status: 200
  content_type: text/event-stream
  stream_format: |
    data: {"text": "chunk..."}\n\n
    data: [DONE]\n\n
```

```bash
curl -X POST http://localhost:3001/api/agents/intake/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"filingId": "<filing-id>", "message": "We have 2 W-2 employees"}' \
  --no-buffer
```

### Run Deadline Calculator

```yaml
endpoint: /api/agents/deadline/run
method: POST
auth: true
request:
  body:
    entityId: string   # required
response:
  status: 200
  body:
    message: string
```

```bash
curl -X POST http://localhost:3001/api/agents/deadline/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"entityId": "<entity-id>"}'
```

### Extract Document Data

```yaml
endpoint: /api/agents/document/extract
method: POST
auth: true
request:
  body:
    documentId: string   # required
response:
  status: 200
  body: object           # extracted data result
```

```bash
curl -X POST http://localhost:3001/api/agents/document/extract \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"documentId": "<document-id>"}'
```

### Prefill Filing Form

```yaml
endpoint: /api/agents/prefill/run
method: POST
auth: true
request:
  body:
    filingId: string   # required
response:
  status: 200
  body: object         # prefilled form data
```

```bash
curl -X POST http://localhost:3001/api/agents/prefill/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"filingId": "<filing-id>"}'
```

### Run Audit Risk Score

```yaml
endpoint: /api/agents/audit-risk/run
method: POST
auth: true
request:
  body:
    filingId: string   # required
response:
  status: 200
  body: object         # risk assessment result
```

```bash
curl -X POST http://localhost:3001/api/agents/audit-risk/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"filingId": "<filing-id>"}'
```

### Tax Q&A (SSE Stream)

```yaml
endpoint: /api/agents/tax-qa/ask
method: POST
auth: true
description: Returns Server-Sent Events stream
request:
  body:
    question: string   # required
response:
  status: 200
  content_type: text/event-stream
  stream_format: |
    data: {"text": "chunk..."}\n\n
    data: [DONE]\n\n
```

```bash
curl -X POST http://localhost:3001/api/agents/tax-qa/ask \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "When is Form 1120 due for a C-Corp with Dec fiscal year?"}' \
  --no-buffer
```

---

## Error Responses

```yaml
errors:
  400:
    description: Validation error (Zod)
    body:
      error: "Validation failed"
      details:
        - path: ["field"]
          message: "error description"
  401:
    description: Missing or invalid JWT token
    body:
      error: "Unauthorized"
  403:
    description: Insufficient permissions or HITL gate
    body:
      error: "Forbidden"
  404:
    description: Resource not found
    body:
      error: "Not found"
  500:
    description: Internal server error
    body:
      error: "Internal server error"
```

---

## Filing Status Workflow

```
intake → ai_prep → cpa_review → founder_approval → submitted → archived
```

| Transition | Who Can Trigger |
|---|---|
| `intake → ai_prep` | System / AI |
| `ai_prep → cpa_review` | System / AI |
| `cpa_review → founder_approval` | CPA only |
| `founder_approval → submitted` | Founder (via approve) |
| `submitted → archived` | System |

## User Roles

```yaml
roles:
  founder: Full access, can approve/reject filings
  team_member: Standard access
  cpa: Can review filings, escalate, advance to founder_approval
  admin: Full administrative access
```
