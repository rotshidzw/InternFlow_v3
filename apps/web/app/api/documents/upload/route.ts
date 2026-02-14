import { prisma } from "@internflow/db/src";
import { documentUploadSchema } from "@internflow/shared/src/schemas";
import { NextResponse } from "next/server";

const expiryByType: Record<string, number | null> = {
  ID: 3650,
  CV: null,
  CERTIFICATE: null,
  AFFIDAVIT: 90,
  PROOF_OF_ADDRESS: 90,
  PAYSLIP: 30
};

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = documentUploadSchema.safeParse({
    ...payload,
    sizeBytes: Number(payload.sizeBytes ?? 1024),
    selfCertified: payload.selfCertified === true || payload.selfCertified === "true"
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const document = await prisma.document.create({
    data: {
      userId: parsed.data.userId,
      type: parsed.data.type,
      status: "PENDING",
      selfCertifiedAt: parsed.data.selfCertified ? new Date() : null,
      versions: {
        create: {
          storageKey: `uploads/${parsed.data.userId}/${Date.now()}-${parsed.data.fileName}`,
          mimeType: parsed.data.mimeType,
          sizeBytes: parsed.data.sizeBytes
        }
      }
    },
    include: { versions: true }
  });

  return NextResponse.json({ ok: true, verification: "PENDING", expiryDays: expiryByType[parsed.data.type], documentId: document.id });
}
