# TaxOS Product Knowledge

## Overview

TaxOS is an AI-first tax compliance platform with role-based workflows for founders, team members, CPAs, and admins. The product centers on entity management, tax filings, document handling, approvals, and onboarding.

Primary route and access logic:
- Frontend routes: `apps/web/src/app/App.tsx`
- Route access rules: `apps/web/src/lib/access.ts`
- Role and permission schema: `packages/shared/schemas/rbac.ts`
- Effective permission logic: `apps/api/src/lib/rbac.ts`

## Roles

### Founder

Purpose:
- Primary operator for an organization
- Owns filings, approvals, team setup, and org-level workflows

Capabilities:
- Full access to filings and documents
- Can approve filings
- Can create team member accounts
- Can manage templates and organization settings
- Can access founder-focused pages like `Home`, `Estimated Tax`, `Registrations`, `R&D Tax Credits`, and entity pages

Key code:
- Role defaults: `apps/api/src/lib/rbac.ts`
- Route access: `apps/web/src/lib/access.ts`

### Team Member

Purpose:
- Contributor inside a founder-managed workspace
- Access is permission-based, not role-wide by default

Capabilities:
- Only sees modules explicitly enabled through assigned permissions
- Can potentially view filings, edit filings, view documents, edit documents, or approve filings depending on assigned permission set

Key code:
- Empty default permissions: `apps/api/src/lib/rbac.ts`
- Permission-driven home page: `apps/web/src/pages/Home.tsx`

### CPA

Purpose:
- Human reviewer in the filing workflow
- Handles CPA review stage and filing review locks

Capabilities:
- Can view and edit filings
- Can view and edit documents
- Can approve filings
- Cannot create accounts or manage the organization

Key code:
- CPA defaults: `apps/api/src/lib/rbac.ts`
- CPA dashboard flow: `apps/web/src/pages/Dashboard.tsx`
- Filing review routes: `apps/api/src/routes/filings.ts`

### Admin

Purpose:
- Platform-level operator
- Handles founder onboarding review, CPA creation, and global administration

Capabilities:
- Full system access
- Reviews founder applications
- Creates CPA users
- Manages role templates

Key code:
- Admin routes: `apps/api/src/routes/admin.ts`
- Dashboard: `apps/web/src/pages/Dashboard.tsx`

## Account Status Model

User statuses are defined in `packages/shared/schemas/rbac.ts`:
- `pending_admin_review`
- `pending_email_verification`
- `active`
- `rejected`
- `suspended`

Special behavior:
- Founders who are not `active` are redirected to onboarding-related flows
- This logic lives in `apps/web/src/lib/access.ts` and `apps/web/src/app/App.tsx`

## Main User Flows

### Founder Registration and Onboarding Flow

Entry points:
- Signup page: `/onboarding/start`
- Verify email page: `/verify-email`
- Onboarding page: `/onboarding`

Flow:
1. Founder signs up from `apps/web/src/pages/FounderSignup.tsx`
2. Frontend calls `POST /api/auth/register-founder`
3. Founder is sent to `VerifyEmailPage`
4. Email verification calls `POST /api/auth/verify-email`
5. User is issued a token and redirected to onboarding
6. Founder completes onboarding in `apps/web/src/pages/Onboarding.tsx`
7. Frontend submits entity details and certificate to `POST /api/auth/complete-founder-onboarding`
8. If founder status becomes `pending_admin_review`, the user sees a waiting state
9. Admin reviews the founder application
10. After approval, founder becomes `active` and reaches the main app

Change points:
- Signup UI: `apps/web/src/pages/FounderSignup.tsx`
- Verify email UI: `apps/web/src/pages/VerifyEmail.tsx`
- Onboarding UI: `apps/web/src/pages/Onboarding.tsx`
- Auth routes: `apps/api/src/routes/auth.ts`

### Admin Founder Review Flow

Entry point:
- `/admin/founder-applications`

Flow:
1. Admin opens `apps/web/src/pages/FounderApplications.tsx`
2. Frontend loads founder applications from `GET /api/admin/founder-applications`
3. Admin reviews certificate details and company metadata
4. Admin approves or rejects using `POST /api/admin/founder-applications/:id/review`
5. Approval activates the founder workspace and entity record flow

Change points:
- Review UI: `apps/web/src/pages/FounderApplications.tsx`
- Admin routes: `apps/api/src/routes/admin.ts`

### Team Member Invite Flow

Entry points:
- Founder/admin create account page: `/profile/create-account`
- Invite accept page: `/accept-invite`

Flow:
1. Founder or admin opens `apps/web/src/pages/CreateAccount.tsx`
2. User can invite a team member with a template or custom permissions
3. Frontend calls `POST /api/members/invite`
4. Invitee opens `/accept-invite?token=...`
5. Invitee sets name and password in `apps/web/src/pages/AcceptInvite.tsx`
6. Frontend calls `POST /api/auth/accept-invite`
7. User signs in and lands on the permission-filtered home view

Change points:
- Invite UI: `apps/web/src/pages/CreateAccount.tsx`
- Invite acceptance UI: `apps/web/src/pages/AcceptInvite.tsx`
- Invite routes: `apps/api/src/routes/members.ts`, `apps/api/src/routes/auth.ts`

### CPA Creation Flow

Entry point:
- `/profile/create-account`

Flow:
1. Admin switches Create Account page to `CPA` mode
2. Admin enters email, name, and temporary password
3. Frontend calls `POST /api/admin/cpas`
4. CPA can later sign in and work from the dashboard

Change points:
- UI: `apps/web/src/pages/CreateAccount.tsx`
- Backend: `apps/api/src/routes/admin.ts`

### Filing Lifecycle Flow

Primary pages:
- `/filings`
- `/filings/:id`
- `/approvals`

Statuses:
- `intake`
- `ai_prep`
- `cpa_review`
- `founder_approval`
- `submitted`
- `archived`

Flow:
1. Founder/admin creates a filing from `apps/web/src/components/filings/CreateFilingModal.tsx`
2. Frontend calls `POST /api/filings`
3. Filing starts in `intake`
4. Intake agent can be started from filing detail
5. User chats with intake agent and submits details
6. Filing can move to `ai_prep`
7. User can run prefill and audit-risk agent actions
8. Filing can move to `cpa_review`
9. CPA can claim or release review lock
10. Filing can move to `founder_approval`
11. Founder/admin approves or rejects
12. Approved filings move to `submitted`
13. Submitted filings can later move to `archived`

Key change points:
- Filing list UI: `apps/web/src/pages/Filings.tsx`
- Filing creation UI: `apps/web/src/components/filings/CreateFilingModal.tsx`
- Filing detail workflow UI: `apps/web/src/pages/FilingDetail.tsx`
- Filing routes: `apps/api/src/routes/filings.ts`
- Approval routes: `apps/api/src/routes/approvals.ts`
- Agent routes: `apps/api/src/routes/agents.ts`

### Document Workflow

Primary page:
- `/documents`

Flow:
1. User uploads documents via `apps/web/src/pages/Documents.tsx`
2. Frontend calls `POST /api/documents/upload`
3. Document can be sent for extraction using AI
4. Frontend calls `POST /api/agents/document/extract`
5. User can mark a document as human-reviewed
6. Frontend calls `PUT /api/documents/:id/review`

Change points:
- Document UI: `apps/web/src/pages/Documents.tsx`
- Document routes: `apps/api/src/routes/documents.ts`
- Extraction route: `apps/api/src/routes/agents.ts`

## Page-by-Page Reference

### Home

Route:
- `/home`

File:
- `apps/web/src/pages/Home.tsx`

What it does:
- Founder view shows action center, filing pipeline summary, and referrals
- Team member view shows only permission-enabled modules and a permission summary
- Admins and CPAs are redirected to `/dashboard`

Who uses it:
- Founder
- Team member

Where to change behavior:
- Founder landing content: `apps/web/src/pages/Home.tsx`
- Team member permission cards: `apps/web/src/pages/Home.tsx`
- Role redirects: `apps/web/src/lib/access.ts`, `apps/web/src/app/App.tsx`

### Dashboard

Route:
- `/dashboard`

File:
- `apps/web/src/pages/Dashboard.tsx`

What it does:
- Admin dashboard shows founder application and CPA overview
- CPA dashboard shows assigned filings and review locks

Who uses it:
- Admin
- CPA

Where to change behavior:
- `apps/web/src/pages/Dashboard.tsx`

### Profile

Route:
- `/profile`

File:
- `apps/web/src/pages/Profile.tsx`

What it does:
- Displays role, organization, and permission summary
- Shows `Create Account` button when allowed

Who uses it:
- All authenticated roles

Where to change behavior:
- `apps/web/src/pages/Profile.tsx`
- `apps/api/src/routes/profile.ts`

### Create Account

Route:
- `/profile/create-account`

File:
- `apps/web/src/pages/CreateAccount.tsx`

What it does:
- Founders can invite team members with templates or custom permissions
- Admins can invite team members and create CPAs
- Supports template recommendation from use case text

Who uses it:
- Founder
- Admin

Where to change behavior:
- UI and permission toggles: `apps/web/src/pages/CreateAccount.tsx`
- Team invite APIs: `apps/api/src/routes/members.ts`
- CPA creation APIs: `apps/api/src/routes/admin.ts`

### Estimated Tax

Route:
- `/estimated-tax`

File:
- `apps/web/src/pages/EstimatedTax.tsx`

What it does:
- Shows projected annual tax, taxable income, quarterly payment schedule, upcoming deadlines, and filing activity by entity
- Pulls data from entities, filings, deadlines, and estimated-tax projection endpoint

Who uses it:
- Founder
- Any role with filing visibility access through route rules

Where to change behavior:
- UI: `apps/web/src/pages/EstimatedTax.tsx`
- Projection logic/API: `apps/api/src/routes/entities.ts`

### Registrations

Route:
- `/registrations`

File:
- `apps/web/src/pages/Registrations.tsx`

What it does:
- Displays federal and state registration statuses
- Current implementation is static/demo content

Who uses it:
- Founder
- Admin

Where to change behavior:
- `apps/web/src/pages/Registrations.tsx`

### R&D Tax Credits

Route:
- `/rd-tax-credits`

File:
- `apps/web/src/pages/RDTaxCredits.tsx`

What it does:
- Informational/marketing page for R&D credit upsell
- CTA buttons are present but not wired to a backend workflow

Who uses it:
- Founder
- Admin

Where to change behavior:
- `apps/web/src/pages/RDTaxCredits.tsx`

### Filings

Route:
- `/filings`

File:
- `apps/web/src/pages/Filings.tsx`

What it does:
- Lists filings by year
- Supports search, year filter, status filter, and a `Pending on me` toggle
- Opens filing creation modal
- Links to workflow view and detail pages

Who uses it:
- Any role with `canViewFilings`

Where to change behavior:
- `apps/web/src/pages/Filings.tsx`
- `apps/web/src/components/filings/CreateFilingModal.tsx`

### Filing Detail

Route:
- `/filings/:id`

File:
- `apps/web/src/pages/FilingDetail.tsx`

What it does:
- Central workflow page for a single filing
- Shows stage progression
- Supports intake chat
- Supports status changes, prefill, audit-risk, pause, escalation, approve, and reject actions
- Pulls related entities and deadlines for context

Who uses it:
- Founder
- CPA
- Team members with filing permissions
- Admin

Where to change behavior:
- UI and action flow: `apps/web/src/pages/FilingDetail.tsx`
- Filing actions: `apps/api/src/routes/filings.ts`
- Agent calls: `apps/api/src/routes/agents.ts`

### Approvals

Route:
- `/approvals`

File:
- `apps/web/src/pages/ApprovalQueue.tsx`

What it does:
- Displays pending and resolved approvals
- Allows approve, reject, escalate, and AI-assisted Q&A

Who uses it:
- Roles with `canApproveFilings`

Where to change behavior:
- `apps/web/src/pages/ApprovalQueue.tsx`
- `apps/api/src/routes/approvals.ts`

### Documents

Route:
- `/documents`

File:
- `apps/web/src/pages/Documents.tsx`

What it does:
- Uploads and searches documents
- Shows AI tags and confidence
- Triggers extraction
- Marks documents as reviewed

Who uses it:
- Roles with document permissions

Where to change behavior:
- `apps/web/src/pages/Documents.tsx`
- `apps/api/src/routes/documents.ts`
- `apps/api/src/routes/agents.ts`

### Founder Applications

Route:
- `/admin/founder-applications`

File:
- `apps/web/src/pages/FounderApplications.tsx`

What it does:
- Admin review queue for pending founder onboarding submissions
- Displays org details, registration metadata, and certificate links

Who uses it:
- Admin

Where to change behavior:
- `apps/web/src/pages/FounderApplications.tsx`
- `apps/api/src/routes/admin.ts`

## Permissions Model

Permission keys are defined in `packages/shared/schemas/rbac.ts`:
- `canViewDashboard`
- `canViewFilings`
- `canEditFilings`
- `canApproveFilings`
- `canViewDocuments`
- `canEditDocuments`
- `canManageTeam`
- `canCreateAccounts`
- `canManageTemplates`
- `canManageOrganization`

Important permission behavior:
- Founders, admins, and CPAs are effectively treated as full-access for route permission checks in the frontend
- Team members rely on explicit permission records
- Route checks are enforced in `apps/web/src/lib/access.ts`
- Backend permission enforcement is handled in route middleware such as `requirePermission(...)`

## Important API Surfaces

Authentication:
- `apps/api/src/routes/auth.ts`

Profile:
- `apps/api/src/routes/profile.ts`

Members and invites:
- `apps/api/src/routes/members.ts`

Admin functions:
- `apps/api/src/routes/admin.ts`

Entities and estimated tax:
- `apps/api/src/routes/entities.ts`

Filings:
- `apps/api/src/routes/filings.ts`

Approvals:
- `apps/api/src/routes/approvals.ts`

Documents:
- `apps/api/src/routes/documents.ts`

Agents:
- `apps/api/src/routes/agents.ts`

## Current Product Gaps

- `Registrations` is static and not connected to backend data
- `R&D Tax Credits` is an informational page without a live workflow
- Some pages listed in navigation are stronger than others in backend completeness
- Filing workflow is the most complete end-to-end area in the product

## Recommended Update Workflow

When changing the product, use this order:
1. Check route access in `apps/web/src/lib/access.ts`
2. Check route registration in `apps/web/src/app/App.tsx`
3. Update page UI in `apps/web/src/pages/...`
4. Update store wiring in `apps/web/src/stores/auth.ts` if data flow changes
5. Update API route and controller behavior in `apps/api/src/routes/...`
6. Update shared schemas in `packages/shared/schemas/...` when contracts change
