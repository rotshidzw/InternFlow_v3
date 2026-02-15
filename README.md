# InternFlow v3 (Multi-tenant SaaS + Demo-ready)

InternFlow is the parent platform. Each organization is an isolated tenant workspace with its own users, opportunities, applications, onboarding, compliance, and operations.

## Stack
- Next.js 14 App Router + TypeScript + Tailwind + Framer Motion
- Prisma + PostgreSQL
- Redis + BullMQ worker
- MinIO object storage
- MailHog for OTP email in local dev
- Recharts for dashboard charts

## Local setup
1. `docker compose up -d`
2. `npm install`
3. `cp .env.example .env` (or `copy .env.example .env` on Windows)
4. `npm run db:push`
5. `npm run db:generate`
6. `npm run db:seed`
7. `npm run dev`

## Service URLs
- App: http://localhost:3000
- MailHog UI: http://localhost:8025
- MailHog SMTP: localhost:1025
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001

## Auth + demo login
- OTP login at `/auth`.
- Demo quick-login buttons are available for:
  - Demo Student (`student@demo.com`)
  - Demo Coordinator (`coordinator@demo.com`)
  - Demo Provider Admin (`provider@demo.com`)
  - Demo Platform Admin (`admin@internflow.com`)
- OTP instructions shown in UI: check MailHog at `http://localhost:8025`.

## Product flow
1. Marketing landing `/`
2. Auth `/auth`
3. Onboarding `/onboarding` → `/onboarding/create-org` → `/onboarding/verify-org`
4. InternFlow approval queue `/platform-admin`
5. Workspace picker `/workspaces`
6. Org role portal `/org/[orgSlug]/home` → role-specific route

## Modules implemented
- Public opportunities listing and detail pages:
  - `/opportunities`
  - `/opportunities/[orgSlug]/[opportunitySlug]`
- Recruitment pipeline:
  - Student apply flow creates `Application`
  - Provider can shortlist/accept/reject applicants
- Student lifecycle dashboard:
  - Application timeline
  - Checklist progress + clickable actions
  - Document vault statuses + expiry metadata
  - Logbook growth summary (rule-based)
- Coordinator dashboard:
  - Cohort/enrollment visibility
  - Missing document queue
  - Stipend mark-paid actions
  - CSV exports for stipend + learner registers
- WhatsApp simulator:
  - Intent actions (status/upload/payslip/certificate/support)
  - Persists chat, tickets, timeline events
- Platform admin:
  - Tenant approvals/rejections
  - Global stats + audit log feed

## OCR/scanning behavior (free)
- Worker queue `document-scan` processes uploads.
- If no OCR engine is configured, heuristic simulation runs:
  - checks mime type + size
  - marks document status `SCAN_OK` or `SCAN_FAILED`
- Affidavit/certificate expiry uses configurable 90-day rule metadata.

## Seed data
`npm run db:seed` creates:
- Platform admin
- 3 organizations
- Provider/coordinator/supervisor/demo users
- 20 students
- 10 opportunities
- 40 applications (mixed statuses)
- mixed checklist progress, docs, payslips, logbooks, messages, tickets
