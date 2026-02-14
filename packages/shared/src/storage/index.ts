import { Client as MinioClient } from "minio";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

class MinioStorageAdapter implements StorageAdapter {
  private client = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin"
  });
  private bucket = process.env.MINIO_BUCKET ?? "internflow-docs";

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.putObject(this.bucket, key, body, body.length, { "Content-Type": contentType });
  }
  async getSignedUrl(key: string) {
    return this.client.presignedGetObject(this.bucket, key, 60 * 10);
  }
  async delete(key: string) {
    await this.client.removeObject(this.bucket, key);
  }
}

class ObsStorageAdapter implements StorageAdapter {
  private bucket = process.env.OBS_BUCKET ?? "internflow-docs";
  private client = new S3Client({
    region: process.env.OBS_REGION ?? "af-south-1",
    endpoint: process.env.OBS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.OBS_AK ?? "",
      secretAccessKey: process.env.OBS_SK ?? ""
    },
    forcePathStyle: true
  });

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }
  async getSignedUrl(key: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 600 });
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export function getStorageAdapter(): StorageAdapter {
  return process.env.STORAGE_PROVIDER === "obs" ? new ObsStorageAdapter() : new MinioStorageAdapter();
}
