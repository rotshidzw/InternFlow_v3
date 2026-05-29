# InternFlow Go-Live Checklist (Head / Body / Students)

Use this as the final deployment checklist for production readiness.

## A) Infrastructure ready
- [ ] ECS instance reachable and updated.
- [ ] RDS PostgreSQL created and accessible from ECS private network.
- [ ] OBS bucket created with correct region/endpoint.
- [ ] Redis available for queues.
- [ ] Security Group rules restricted to required ports only.
- [ ] Optional load balancer / domain / TLS configured.

## B) Environment and secrets
- [ ] `.env.production` created from `.env.production.example`.
- [ ] `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SESSION_SECRET`, `REDIS_URL` set.
- [ ] `OTP_STORE_BACKEND=redis`, `OTP_ENFORCE_DURABLE=true`, and `OTP_ALLOW_MEMORY_FALLBACK=false` configured.
- [ ] OBS credentials configured (`OBS_ACCESS_KEY`/`OBS_SECRET_KEY`).
- [ ] OCR credentials configured when OCR is enabled.
- [ ] SMTP credentials configured and tested.
- [ ] `npm run check:prod-env` passes with no blocking errors.

## C) Data readiness
- [ ] Existing local data exported and imported into RDS (if needed).
- [ ] `npm run db:generate` and `npm run db:push` executed in production environment.
- [ ] Seed data reviewed (no demo-only data exposed unless intentional).

## D) Product flow validation

### Head (InternFlow HQ)
- [ ] HQ login works.
- [ ] `/hq/dashboard` loads with metrics.
- [ ] `/hq/tenants` list and tenant detail page load.
- [ ] support/approvals actions persist to database.

### Body (Tenant organizations)
- [ ] Tenant workspace routes load for each org.
- [ ] Organization users can authenticate and perform role actions.
- [ ] Communication views show expected data.

### Students
- [ ] Student signup/login flows work.
- [ ] Student profile creation/update persists.
- [ ] Document uploads succeed and persist to OBS.
- [ ] OCR workflow works for enabled document types.
- [ ] Student↔organization communication history is persisted and reloads.

## E) Operability
- [ ] Application logs visible and searchable.
- [ ] Background worker process running continuously.
- [ ] Redis is reachable from both web and worker runtimes.
- [ ] Health checks and restart policy configured.
- [ ] Backup plan documented (RDS snapshot + DB dump).
- [ ] Rollback plan prepared.

## F) Tonight release cutover plan
1. Freeze schema changes.
2. Final DB backup.
3. Deploy application.
4. Run smoke tests across Head/Body/Students.
5. Open access to pilot users.
6. Monitor first 60 minutes (errors, upload failures, queue lag, auth errors).
