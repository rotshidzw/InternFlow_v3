import { prisma } from "@internflow/db/src";
import { documentUploadSchema } from "@internflow/shared/src/schemas";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const expiryByType: Record<string, number | null> = {
  ID: 3650,
  CV: null,
  CERTIFICATE: 90,
  AFFIDAVIT: 90,
  PROOF_OF_ADDRESS: 90,
  PAYSLIP: 30,
  APPLICATION_SUPPORTING_DOC: null
};

const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const scanQueue = new Queue("document-scan", { connection: redisConnection });

function computeExpiration(type: string) {
  const days = expiryByType[type];
  if (!days) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const storage = getStorageAdapter();

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const parsed = documentUploadSchema.safeParse({
      userId: String(formData.get("userId") ?? ""),
      type: String(formData.get("type") ?? ""),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      selfCertified: formData.get("selfCertified") === "true"
    });

    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const storageKey = `uploads/${parsed.data.userId}/${Date.now()}-${parsed.data.fileName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await storage.put(storageKey, bytes, parsed.data.mimeType);

    const document = await prisma.document.create({
      data: {
        userId: parsed.data.userId,
        type: parsed.data.type,
        status: "SCAN_PENDING",
        expirationDate: computeExpiration(parsed.data.type),
        selfCertifiedAt: parsed.data.selfCertified ? new Date() : null,
        versions: {
          create: {
            storageKey,
            mimeType: parsed.data.mimeType,
            sizeBytes: parsed.data.sizeBytes
          }
        }
      },
      include: { versions: true }
    });

    await scanQueue.add("scanDocument", { documentId: document.id, mimeType: parsed.data.mimeType, sizeBytes: parsed.data.sizeBytes, fileName: parsed.data.fileName });

    return NextResponse.json({ ok: true, verification: "SCAN_PENDING", expiryDays: expiryByType[parsed.data.type], documentId: document.id, storageKey });
  }

  const payload = await req.json();
  const parsed = documentUploadSchema.safeParse({
    ...payload,
    sizeBytes: Number(payload.sizeBytes ?? 1024),
    selfCertified: payload.selfCertified === true || payload.selfCertified === "true"
  });

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const storageKey = `uploads/${parsed.data.userId}/${Date.now()}-${parsed.data.fileName}`;
  await storage.put(storageKey, Buffer.from("InternFlow placeholder file"), parsed.data.mimeType);

  const document = await prisma.document.create({
    data: {
      userId: parsed.data.userId,
      type: parsed.data.type,
      status: "SCAN_PENDING",
      expirationDate: computeExpiration(parsed.data.type),
      selfCertifiedAt: parsed.data.selfCertified ? new Date() : null,
      versions: {
        create: {
          storageKey,
          mimeType: parsed.data.mimeType,
          sizeBytes: parsed.data.sizeBytes
        }
      }
    },
    include: { versions: true }
  });

  await scanQueue.add("scanDocument", { documentId: document.id, mimeType: parsed.data.mimeType, sizeBytes: parsed.data.sizeBytes, fileName: parsed.data.fileName });

  return NextResponse.json({ ok: true, verification: "SCAN_PENDING", expiryDays: expiryByType[parsed.data.type], documentId: document.id, storageKey });
}
