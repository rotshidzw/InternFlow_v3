import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@internflow/shared/src/storage";

export async function POST(req: Request, { params }: { params: { opportunityId: string } }) {
  const form = await req.formData();
  const userId = String(form.get("userId") ?? "");
  const file = form.get("file");
  if (!userId) return NextResponse.json({ ok: false, error: "Missing user" }, { status: 400 });

  const application = await prisma.application.create({
    data: {
      userId,
      opportunityId: params.opportunityId,
      status: "APPLIED",
      submittedAt: new Date()
    }
  });

  if (file instanceof File) {
    const key = `applications/${userId}/${Date.now()}-${file.name}`;
    await getStorageAdapter().put(key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
    await prisma.document.create({
      data: {
        userId,
        type: "APPLICATION_SUPPORTING_DOC",
        status: "SUBMITTED",
        versions: { create: { storageKey: key, mimeType: file.type || "application/octet-stream", sizeBytes: file.size } }
      }
    });
  }

  await prisma.auditLog.create({ data: { userId, action: "APPLICATION_SUBMITTED", metadata: { applicationId: application.id } } });

  return NextResponse.redirect(new URL("/workspaces", req.url));
}
