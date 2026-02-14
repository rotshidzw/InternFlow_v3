# InternFlow v3 (Multi-tenant SaaS)

InternFlow is the **parent platform**. Each company or training provider is a **tenant organization** with isolated workspaces, users, opportunities, and learner operations.

## Stack
- Next.js 14 App Router + TypeScript + Tailwind + Framer Motion
- Prisma + PostgreSQL
- Redis + BullMQ worker
- MinIO (default) / Huawei OBS (optional)
- MailHog for OTP email delivery in local development

## Local quick start
1. Install Docker Desktop + Node.js 20+.
2. Copy env:
   - `copy .env.example .env` (Windows CMD)
   - `cp .env.example .env` (bash)
3. Start infra:
   - `docker compose up -d`
4. Install dependencies:
   - `npm install`
5. Prepare DB:
   - `npm run db:push`
   - `npm run db:generate`
   - `npm run db:seed`
6. Run app:
   - `npm run dev`

## Service URLs
- Web: http://localhost:3000
- MailHog UI: http://localhost:8025
- MailHog SMTP: localhost:1025
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001
- MinIO login: `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`

## Correct product flow
1. **Landing**: marketing-only experience (`/`) with `Get Started` and `Try Demo`.
2. **Auth**: OTP login at `/auth`.
3. **Onboarding**: if user has no memberships, continue to `/onboarding`.
4. **Organization creation**: `/onboarding/create-org`.
5. **Organization verification**: `/onboarding/verify-org` upload compliance docs.
6. **Platform approval**: InternFlow admin reviews at `/platform-admin`.
7. **Workspace selection**: `/workspaces` (Slack-like selector).
8. **Org workspace**: `/org/[orgSlug]/[role]` role portal.

## OTP notes
- SMTP config uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
- Host-run dev uses `SMTP_HOST=localhost`; Dockerized Next.js uses `SMTP_HOST=mailhog`.
- OTP fallback logs to server as `[DEV OTP] email=<email> code=<code>` if SMTP fails.

## Demo mode
- Demo route is `/demo` only.
- Demo is read-only, role-switchable preview mode.
- Demo links are intentionally not shown in logged-in workspace navigation.

## Seeded demo data
`npm run db:seed` creates:
- InternFlow System Admin
- Approved orgs: `raftech`, `demo-training-provider`
- Memberships: provider admin, coordinators, supervisor, students
- Opportunities + applications (accepted/rejected) + cohort enrollment

## Dev troubleshooting
- Use command exactly as `npm install` (not `run npm install`).
- If `npm run dev` reports missing `nodemailer`, rerun `npm install` at repository root.
- If Turborepo warns about lockfile/workspaces, run `npm install` to regenerate `package-lock.json`.
