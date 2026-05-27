import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function env(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function obsClient() {
  return new S3Client({
    region: env("OBS_REGION", "af-south-1"),
    endpoint: env("OBS_ENDPOINT"),
    credentials: {
      accessKeyId: process.env.OBS_ACCESS_KEY ?? process.env.OBS_AK ?? "",
      secretAccessKey: process.env.OBS_SECRET_KEY ?? process.env.OBS_SK ?? ""
    },
    forcePathStyle: true
  });
}

function bucketName() {
  return env("OBS_BUCKET");
}

export async function obsCreateSignedUploadUrl(key: string, contentType: string, expiresSeconds = 300) {
  const client = obsClient();
  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(client, command, { expiresIn: expiresSeconds });
}

export async function obsCreateSignedDownloadUrl(key: string, expiresSeconds = 300) {
  const client = obsClient();
  const command = new GetObjectCommand({ Bucket: bucketName(), Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresSeconds });
}
