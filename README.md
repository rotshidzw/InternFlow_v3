# InternFlow v3 (Turborepo)

Production-style student project for internship/learnership administration.

## Stack
- Next.js 14 App Router + TypeScript + Tailwind + Framer Motion
- Prisma + PostgreSQL
- Redis + BullMQ worker
- MinIO (default) / Huawei OBS (optional)
- MailHog local OTP email testing

## Monorepo
```
/apps
  /web
  /worker
/packages
  /db
  /shared
  /ui
```

## Local quick start (Windows-friendly)
1. Install Docker Desktop + Node.js 20+.
2. Copy env:
   - `copy .env.example .env` (Windows CMD)
   - or `cp .env.example .env` (bash)
3. Start infra:
   - `docker compose up -d`
4. Install deps:
   - `npm install`
5. Push DB schema, generate Prisma client, and seed:
   - `npm run db:push`
   - `npm run db:generate`
   - `npm run db:seed`
6. Start app + worker:
   - `npm run dev`

## Local service URLs
- Web: http://localhost:3000
- MailHog UI: http://localhost:8025
- MailHog SMTP: localhost:1025
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001
- MinIO Login: `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`

## OTP + SMTP notes
- The OTP API sends mail through nodemailer using `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`.
- If `SMTP_HOST` is unset, InternFlow defaults to `localhost`.
- If app runs on the host (`npm run dev`), use `SMTP_HOST=localhost`.
- If app runs inside Docker, use `SMTP_HOST=mailhog`.
- If SMTP delivery fails in development, the OTP is still logged in server output as:
  - `[DEV OTP] email=<email> code=<code>`

## Scripts
- `npm run dev`
- `npm run build`
- `npm run db:push`
- `npm run db:generate`
- `npm run db:seed`

## Demo accounts
- student@demo.com
- coordinator@demo.com
- supervisor@demo.com
- provider@demo.com
- admin@demo.com

## Implemented end-to-end flow
auth OTP -> org setup -> student checklist + document upload metadata -> logbook approval -> coordinator dashboard -> whatsapp simulator -> ticket summary AI endpoint.

See `docs/HUAWEI_CLOUD_SETUP.md` for optional Huawei integration.

## Prisma troubleshooting (Windows / unstable network)
If `npm run db:push` fails after "Your database is now in sync" during Prisma generate, use:
1. `npm run db:push` (now runs with `--skip-generate`)
2. `npm run db:generate` (run separately/retry if network resets)

This separates schema sync from engine/client download so DB setup can still complete.
