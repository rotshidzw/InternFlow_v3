# InternFlow v3 (Turborepo)

Production-style student project for internship/learnership administration.

## Stack
- Next.js 14 App Router + TypeScript + Tailwind + Framer Motion
- Prisma + PostgreSQL
- Redis + BullMQ worker
- MinIO (default) / Huawei OBS (optional)
- Mailhog local OTP email testing

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
5. Push DB schema and seed:
   - `npm run db:push`
   - `npm run db:seed`
6. Start app + worker:
   - `npm run dev`

Web: http://localhost:3000  
Mailhog: http://localhost:8025  
MinIO console: http://localhost:9001

## Scripts
- `npm run dev`
- `npm run build`
- `npm run db:push`
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
