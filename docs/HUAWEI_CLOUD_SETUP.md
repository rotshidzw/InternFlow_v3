# Huawei Cloud Optional Setup (InternFlow)

InternFlow runs locally by default with Postgres + MinIO. Use Huawei Cloud only when needed.

## 1) Create IAM AK/SK
1. In Huawei Console, open **IAM**.
2. Create a user with programmatic access.
3. Generate **Access Key (AK)** and **Secret Key (SK)**.

## 2) Create RDS for PostgreSQL
1. Provision smallest PostgreSQL RDS instance (cost-saving).
2. Allow your IP in security group.
3. Copy endpoint and port.
4. Set:

```env
DATABASE_URL=postgresql://<user>:<password>@<rds-endpoint>:5432/<db>?schema=public
```

## 3) Create OBS Bucket
1. Create OBS bucket (standard storage class).
2. Capture bucket name, endpoint, region.
3. Set:

```env
STORAGE_PROVIDER=obs
OBS_AK=<ak>
OBS_SK=<sk>
OBS_ENDPOINT=https://obs.<region>.myhuaweicloud.com
OBS_BUCKET=<bucket>
OBS_REGION=<region>
```

## 4) Keep costs low
- Use small RDS specs for demos.
- Suspend/stop unused resources.
- Avoid managed AI services for MVP.
