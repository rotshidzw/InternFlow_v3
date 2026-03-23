# InternFlow Product Redesign Map

## Platform map

## A) Head (Platform Core)

### Responsibilities
- brand shell, identity, platform governance
- tenant onboarding/approval lifecycle
- global integrations (OCR, storage, notifications)
- platform analytics, support, audit administration

### Primary routes
- `/`
- `/auth/*`
- `/onboarding/*`
- `/hq/*`

## B) Body (Tenant Workspace)

### Responsibilities
- programme operations
- learner intake and compliance
- approvals, reports, stipends, close-out
- internal team + learner communication

### Primary routes
- `/org/[orgSlug]/app/dashboard`
- `/org/[orgSlug]/app/programs`
- `/org/[orgSlug]/app/templates`
- `/org/[orgSlug]/app/opportunities`
- `/org/[orgSlug]/app/applicants`
- `/org/[orgSlug]/app/enrollments`
- `/org/[orgSlug]/app/documents`
- `/org/[orgSlug]/app/logbooks`
- `/org/[orgSlug]/app/approvals`
- `/org/[orgSlug]/app/reports`
- `/org/[orgSlug]/app/stipends`
- `/org/[orgSlug]/app/staff`
- `/org/[orgSlug]/app/settings`
- `/org/[orgSlug]/app/reports/exports`

## C) Legs (Student Portal)

### Responsibilities
- low-anxiety personal workflow
- profile and intake completion
- invite token join and assignment
- task checklist + docs + logbooks + payslips

### Primary routes
- `/app/student`
- `/org/[orgSlug]/student`
- `/explore`
- `/auth/setup?mode=join`

## Workflow map

1. Tenant is approved and operational.
2. Tenant configures programme + opportunity + requirements.
3. Tenant shares invite token (or student enters controlled intake path).
4. Student completes profile, uploads CV/docs, receives status updates.
5. Tenant reviews, returns/fixes, approves, and tracks progress.
6. Tenant exports evidence packs for close-out/compliance.

## UI/UX redesign system plan

- Shared tokenized spacing, type, status, card, and form patterns.
- Strong route-level role clarity and no cross-role dead ends.
- Calm progression cues for student tasks.
- Workspace-grade density for tenant operations.
- Consistent status semantics across dashboards, docs, and approvals.

## Hardening map

- Production env guardrails (`scripts/validate-production-env.mjs`).
- Huawei credential setup guide and least-privilege IAM notes.
- Go-live and cutover checklists tied to critical user journeys.
