# InternFlow v3

InternFlow is a Huawei-ready, multi-tenant operations platform for internships, learnerships, apprenticeships, mentorship, entrepreneurship programmes, and broader skills development administration.

It is designed to reduce admin burden for organisations and training providers while keeping the learner experience calm, clear, and mobile-first.

---

## 1) Product architecture model (Head / Body / Student)

InternFlow is intentionally split into three layers:

### A. Head (InternFlow Platform Core)
Routes: `/`, `/auth/*`, `/hq/*`, selected onboarding routes.

Contains:
- global platform identity and shell
- tenant onboarding and workspace provisioning
- platform auth + role governance
- Huawei integrations (OBS, OCR, ECS/RDS deployment model)
- notifications and audit foundations
- shared design system and PWA shell

### B. Body (Tenant / Organisation Workspace)
Routes: `/org/[orgSlug]/app/*`

Contains:
- programme and opportunity management
- learner intake/review workflows
- document review/returns
- approvals, reports, exports, close-out packs
- stipends/payslip operations
- staff and settings
- organisation ↔ learner communication

### C. Legs (Student Portal)
Routes: `/app/student`, `/org/[orgSlug]/student`, intake/profile routes.

Contains:
- profile + CV upload/intake
- invite-token join and assignment journey
- document tasks and status tracking
- logbooks, payslips, messaging, notifications

Rules:
- Students do not create organisations.
- Students do not operate platform-core workflows.
- Organisations create/manage tenant workspaces.
- Students join via invite flow or controlled intake, then attach to an organisation/programme.

---

## 2) Core platform modules

### Head modules
- HQ Dashboard (`/hq/dashboard`)
- Tenant Directory (`/hq/tenants`)
- Approvals (`/hq/approvals`)
- Meetings (`/hq/meetings`)
- Support (`/hq/support`)
- Observability (`/hq/observability`)
- HQ User/Roles (`/hq/users`)
- HQ Settings (`/hq/settings`)

### Body modules
- Dashboard
- Programmes
- Templates
- Opportunities
- Applicants / Enrolments
- Documents
- Logbooks
- Approvals
- Workspace / Staff
- Reports
- Stipends
- Settings
- Exports / Close-out packs
- Learner communication

### Student modules
- Profile + CV parsing
- Opportunity discovery/application
- Invite-token join
- Required document uploads
- Returns/fix-up responses
- Logbooks and checklist
- Payslip visibility
- Organisation communication

---

## 3) Local development setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose

### Run locally
1. `docker compose up -d`
2. `npm install`
3. `cp .env.example .env.local` (Windows: `copy .env.example .env.local`)
4. `npm run db:generate`
5. `npm run db:push`
6. `npm run db:seed`
7. `npm run dev`

> Local env resolution: backend APIs read env from `process.env`, then fallback to `.env.local` / `.env` in repo root and `apps/web/.env.local` / `apps/web/.env`. For OpenRouter in local development, set `ENABLE_AI_ENRICHMENT=true` and `OPENROUTER_API_KEY` in one of those files, then restart `npm run dev`.

### Local URLs
- App: `http://localhost:3000`
- MailHog UI: `http://localhost:8025`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

### Seeded MVP UAT smoke
After seeding and starting the app, run:

```bash
npm run verify:mvp:seeded -- --base-url=http://localhost:3000
```

This verifies core public/auth checks, role-protected API behavior, tenant-bound logbook flow, and key student/coordinator/HQ paths against seeded demo users.

---

## 4) Production setup (Huawei ECS target)

### Runtime path
- Build app in workspace root
- Run web service on ECS
- Connect to Huawei RDS PostgreSQL
- Connect to Huawei OBS storage
- Connect OCR endpoints for document intelligence

### Basic production commands
```bash
npm ci
npm run db:generate
npm run db:push
npm run build
npm run check:prod-env
npm run start --workspace @internflow/web
```

> See `docs/HUAWEI_CLOUD_SETUP.md` and `docs/HUAWEI_INTEGRATION_GUIDE.md` for step-by-step cloud setup.

---

## 5) Huawei services used

1. **ECS**: application hosting and worker runtime.
2. **RDS PostgreSQL**: primary transactional database.
3. **OBS**: object/document storage (CVs, IDs, learner documents, exports).
4. **Huawei OCR**: document extraction + validation signal inputs.
5. **Cloud Eye / host security**: monitoring and instance hardening.

---

## 6) Huawei credentials: where to get them and where to place them

### Required env variables
Use `.env.production.example` as your template.

- Database
  - `DATABASE_URL`
- Core app/auth
  - `APP_URL`
  - `NEXTAUTH_SECRET`
- Queue
  - `REDIS_URL`
- OBS storage
  - `STORAGE_PROVIDER=obs`
  - `OBS_BUCKET`
  - `OBS_REGION`
  - `OBS_ENDPOINT`
  - `OBS_ACCESS_KEY` / `OBS_SECRET_KEY` (aliases: `OBS_AK` / `OBS_SK`)
- OCR
  - `ENABLE_OCR`
  - `OCR_ENABLED_DOC_TYPES`
  - `HUAWEI_OCR_ENDPOINT`
  - `HUAWEI_PROJECT_ID`
  - `HUAWEI_ACCESS_KEY`
  - `HUAWEI_SECRET_KEY`
- SMTP
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `MAIL_FROM`

### Credential source pointers
- IAM AK/SK: Huawei Cloud Console → IAM → Users → Security Credentials.
- OCR project ID: Huawei Cloud Console → My Credentials / IAM project context.
- OBS endpoint/region: OBS bucket details page.
- RDS endpoint: RDS instance overview.

Detailed credential retrieval guide: `docs/HUAWEI_INTEGRATION_GUIDE.md`.

---

## 7) Connect OBS

1. Create OBS bucket.
2. Configure lifecycle, retention, and access controls.
3. Set `STORAGE_PROVIDER=obs` and OBS env vars.
4. Validate upload by testing learner document upload in app.

---

## 8) Connect OCR

1. Enable OCR service in your Huawei account/region.
2. Set OCR env values and `ENABLE_OCR=true`.
3. Upload supported doc types and inspect OCR/validation behavior.
4. Keep fallback behavior (manual review) if OCR credentials are unavailable.

---

## 9) Security notes

- Never commit real AK/SK, DB passwords, or SMTP secrets.
- Keep RDS/Redis private-network only.
- Restrict security-group inbound rules.
- Use HTTPS termination (LB/Nginx + cert).
- Rotate secrets and enforce least-privilege IAM policies.

---

## 10) Invite system flow (student onboarding)

1. Tenant staff create invite token/link.
2. Token is programme-bound and expires.
3. Student enters controlled join flow.
4. Student is attached to organisation/programme.
5. Student completes profile + required documents.

API touchpoint: `/api/auth/join` and tenant invite route(s) under `/api/org/[orgSlug]/student-invites`.

---

## 11) OCR + document validation flow

1. Learner uploads documents.
2. OCR extraction runs for configured document types.
3. Rule checks classify outcome:
   - accepted
   - needs-review
   - returned-for-correction
4. Tenant reviewers can return with clear reasons.
5. Learner receives status + replacement upload actions.

---

## 12) Exports and close-out packs

Tenants can create close-out exports including evidence bundles and reports for funders/compliance bodies.

Key routes:
- `/org/[orgSlug]/app/reports/exports`
- `/api/org/[orgSlug]/exports/closeout`
- `/api/org/[orgSlug]/exports/closeout/download`

---

## 13) Competition demo flow

1. HQ user signs in and reviews tenants.
2. Tenant user sets programme/opportunity and sends student invite.
3. Student joins via invite token, completes profile, uploads docs/CV.
4. OCR + review workflow processes docs.
5. Tenant reviews applicant/enrolment, logbook, stipend, reports.
6. Tenant generates close-out export pack.

---

## 14) Known limitations / planned hardening

- Some modules still require deeper automation for full enterprise scale.
- OCR confidence/rule logic should be continuously calibrated by programme type.
- WhatsApp-style chat exists in-app; direct WhatsApp integration remains future roadmap.

---

## 15) Additional docs

- `docs/ARCHITECTURE_ALIGNMENT_REVIEW.md`
- `docs/PRODUCT_REDESIGN_MAP.md`
- `docs/HUAWEI_CLOUD_SETUP.md`
- `docs/HUAWEI_INTEGRATION_GUIDE.md`
- `docs/GO_LIVE_CHECKLIST.md`
