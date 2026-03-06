# Huawei Cloud Setup (InternFlow)

This runbook maps directly to your target architecture:
- **Head (InternFlow HQ)**: platform users under `/hq/*`
- **Body (Tenants/Organizations)**: each org under `/org/[orgSlug]/*`
- **Students**: users interacting with tenant workspaces and uploads

Use this document to move from local services (Postgres/MinIO) to Huawei Cloud services safely.

## 1) Provision core cloud resources
1. **ECS** (Ubuntu) for the app runtime.
2. **RDS PostgreSQL** for persistent relational data.
3. **OBS bucket** for document/media storage.
4. **Redis** (managed or ECS-hosted) for queues and background jobs.
5. **Security Groups / EIP / optional Load Balancer** for secure ingress.

> Your provided ECS topology screenshot already shows ECS + EIP + SG + monitoring, which is the right base.

## 2) IAM and credentials
Create an IAM user for InternFlow integrations with programmatic access only.

Required secrets:
- AK/SK for OBS
- AK/SK + Project ID for OCR (if OCR is enabled)
- SMTP credentials for OTP/email notifications

Store all secrets in `.env.production` on ECS (never commit real values).

## 3) Configure production environment
Start from `.env.production.example` and fill in real values.

```env
NODE_ENV=production
APP_URL=http://<ECS_PUBLIC_IP_OR_DOMAIN>
DATABASE_URL=postgresql://internflow:<PASSWORD>@<RDS_PRIVATE_IP>:5432/internflow?schema=public
NEXTAUTH_SECRET=<LONG_RANDOM_SECRET>
REDIS_URL=redis://<redis-host>:6379

STORAGE_PROVIDER=obs
OBS_BUCKET=<bucket>
OBS_REGION=<region>
OBS_ENDPOINT=https://obs.<region>.myhuaweicloud.com
OBS_ACCESS_KEY=<AK>
OBS_SECRET_KEY=<SK>
# Optional backward-compatible aliases
OBS_AK=<AK>
OBS_SK=<SK>

ENABLE_OCR=true
HUAWEI_OCR_ENDPOINT=https://ocr.<region>.myhuaweicloud.com/v2/{project_id}/ocr/web-image
HUAWEI_PROJECT_ID=<PROJECT_ID>
HUAWEI_ACCESS_KEY=<AK>
HUAWEI_SECRET_KEY=<SK>
```

## 4) Database migration from local to RDS
If you already have local tenant/student data, migrate before go-live.

```bash
# Export local DB
pg_dump "postgresql://postgres:postgres@localhost:5432/internflow" > internflow_local.sql

# Import into RDS
psql "postgresql://internflow:<PASSWORD>@<RDS_PRIVATE_IP>:5432/internflow" < internflow_local.sql
```

Then run schema checks/migrations from the app host:

```bash
npm run db:generate
npm run db:push
```

## 5) Network and security checklist
- Open inbound ports only as needed (typically `80`/`443` and SSH admin access).
- Restrict RDS and Redis to private network access.
- Ensure ECS can reach RDS/OBS/Redis endpoints.
- Add TLS termination (Nginx + certificate) before production traffic.

## 6) Functional smoke tests (Head/Body/Students)
After deployment, verify these critical flows:
1. **Head/HQ**: login and open `/hq/dashboard`, `/hq/tenants`, `/hq/support`.
2. **Body/Tenant**: tenant workspace loads, role-based pages render.
3. **Students**:
   - profile create/update works,
   - file upload succeeds and lands in OBS,
   - OCR queue triggers (if enabled),
   - status updates visible to organization/HQ.
4. **Communication**:
   - OTP emails deliver,
   - tenant ↔ student messaging routes persist and reload correctly.

## 7) Common issues and fixes
- **Student profile not saving**: check `DATABASE_URL`, Prisma schema sync (`db:push`), and app logs.
- **Uploads fail**: verify `STORAGE_PROVIDER=obs`, bucket policy, and AK/SK permissions.
- **OCR not running**: ensure `ENABLE_OCR=true` and OCR endpoint/project credentials are valid.
- **Notifications missing**: verify SMTP credentials and sender domain config.
- **Cross-team sync issues**: inspect Redis connectivity and worker process health.

## 8) Cost and reliability tips
- Start with small RDS specs and scale up after load testing.
- Keep Cloud Eye monitoring and log retention enabled.
- Snapshot RDS before major releases.
- For tonight's cutover, deploy during low traffic and keep rollback SQL dumps.
