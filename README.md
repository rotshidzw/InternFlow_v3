# InternFlow v3

InternFlow is a multi-tenant platform with two experiences:
- **InternFlow HQ** (`/hq/*`) for platform teams (sales/support/ops/admin)
- **Tenant Workspaces** (`/org/[orgSlug]/*`) for each organization

## Stack
- Next.js App Router + TypeScript + Tailwind + Framer Motion
- Prisma + PostgreSQL
- Redis + BullMQ worker
- MinIO object storage
- MailHog for local email

## Local setup
1. `docker compose up -d`
2. `npm install`
3. `cp .env.example .env` (or `copy .env.example .env` on Windows)
4. `npm run db:push`
5. `npm run db:generate`
6. `npm run db:seed`
7. `npm run dev`

## URLs
- App: http://localhost:3000
- MailHog UI: http://localhost:8025
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001

## HQ portal routes
- `/hq` -> `/hq/dashboard`
- `/hq/dashboard`
- `/hq/tenants`
- `/hq/tenants/[tenantId]`
- `/hq/approvals`
- `/hq/meetings`
- `/hq/support`
- `/hq/observability`
- `/hq/users`
- `/hq/settings`

## HQ roles
Platform access is enforced with `PlatformMembership` roles:
- `PLATFORM_ADMIN`
- `PLATFORM_SALES`
- `PLATFORM_SUPPORT`
- `PLATFORM_OPS`
- `PLATFORM_FINANCE`

Only users with one of these roles can access `/hq`.

## Demo credentials (OTP via MailHog)
- Platform Admin: `admin@internflow.com`
- Platform Sales: `sales@internflow.com`
- Platform Support: `support@internflow.com`
- Demo Student: `student@demo.com`
- Demo Coordinator: `coordinator@demo.com`
- Demo Provider Admin: `provider@demo.com`

Use `/auth` and check OTP in MailHog at `http://localhost:8025`.

## HQ feature set
- Dashboard cards + readable charts (axes/legend/tooltip) + activity feed
- Tenant directory with filters and detail pages
- Approvals queue (approve/reject with audit + MailHog notification)
- Meetings scheduler + reminder email to tenant contact users (provider/coordinator/supervisor)
- Support queue with actions (request info with custom message, resolve, escalate)
- Observability page + metrics CSV export
- HQ users and role assignment with audit logging
- Writing Assistant (local Grammarly-style suggestions) for cleaner tenant communication

## Dev-only impersonation
`POST /api/hq/impersonate/[orgId]` only works when:
- `ENABLE_DEV_IMPERSONATION=true`
