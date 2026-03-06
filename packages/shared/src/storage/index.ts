import { Client as MinioClient } from "minio";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  getBuffer(key: string): Promise<Buffer>;
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
  private bucketInitPromise: Promise<void> | null = null;

  private async ensureBucket() {
    if (!this.bucketInitPromise) {
      this.bucketInitPromise = (async () => {
        const exists = await this.client.bucketExists(this.bucket);
        if (!exists) {
          await this.client.makeBucket(this.bucket);
          console.info(`[storage] Created MinIO bucket: ${this.bucket}`);
        }
      })().catch((error) => {
        this.bucketInitPromise = null;
        throw error;
      });
    }

    return this.bucketInitPromise;
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, key, body, body.length, { "Content-Type": contentType });
  }

  async getBuffer(key: string) {
    await this.ensureBucket();
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  async getSignedUrl(key: string) {
    await this.ensureBucket();
    return this.client.presignedGetObject(this.bucket, key, 60 * 10);
  }

  async delete(key: string) {
    await this.ensureBucket();
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

  async getBuffer(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!res.Body) return Buffer.alloc(0);
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getSignedUrl(key: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 600 });
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    adapter = process.env.STORAGE_PROVIDER === "obs" ? new ObsStorageAdapter() : new MinioStorageAdapter();
  }

  return adapter;
}
