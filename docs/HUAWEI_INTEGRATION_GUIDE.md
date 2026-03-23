# Huawei Integration Guide (InternFlow)

This guide explains exactly what to collect from Huawei Cloud and where to place each value.

## 1) Services you need

- ECS (application host)
- RDS for PostgreSQL (primary data)
- OBS (documents and exports)
- OCR service (document intelligence)
- IAM user with programmatic access

## 2) IAM AK/SK

1. Open Huawei Cloud Console.
2. Go to **IAM** → **Users**.
3. Create/select integration user.
4. Open **Security Credentials** and generate Access Key.
5. Save AK/SK securely.

Use for:
- `OBS_ACCESS_KEY`, `OBS_SECRET_KEY`
- `HUAWEI_ACCESS_KEY`, `HUAWEI_SECRET_KEY`

## 3) OBS setup and values

1. Open **OBS** and create bucket.
2. Note:
   - Bucket name
   - Region
   - Endpoint

Populate:
- `STORAGE_PROVIDER=obs`
- `OBS_BUCKET=<bucket>`
- `OBS_REGION=<region>`
- `OBS_ENDPOINT=https://obs.<region>.myhuaweicloud.com`
- `OBS_ACCESS_KEY=<AK>`
- `OBS_SECRET_KEY=<SK>`

Optional aliases (supported):
- `OBS_AK`
- `OBS_SK`

## 4) OCR setup and values

1. Enable OCR service in target region.
2. Locate project ID from credential/project settings.
3. Build endpoint in this form:
   - `https://ocr.<region>.myhuaweicloud.com/v2/{project_id}/ocr/web-image`

Populate:
- `ENABLE_OCR=true`
- `OCR_ENABLED_DOC_TYPES=ID,CERTIFICATE,PROOF_OF_ADDRESS`
- `HUAWEI_OCR_ENDPOINT=<endpoint_with_project_placeholder>`
- `HUAWEI_PROJECT_ID=<project_id>`
- `HUAWEI_ACCESS_KEY=<AK>`
- `HUAWEI_SECRET_KEY=<SK>`

## 5) RDS setup and values

1. Create PostgreSQL RDS instance.
2. Enable private-network access from ECS security group.
3. Capture endpoint/port/db/user/password.

Populate:
- `DATABASE_URL=postgresql://<user>:<password>@<rds-host>:5432/<db>?schema=public`

## 6) Validate before go-live

Run:
```bash
npm run check:prod-env
```

This checks required env keys and fails fast if critical values are missing.

## 7) Security checklist

- Use least privilege IAM policies.
- Rotate AK/SK.
- Keep secrets out of git.
- Restrict RDS and Redis ingress to private network.
- Use HTTPS in production.
