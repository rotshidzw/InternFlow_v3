import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { runHuaweiGeneralTextOcr } from "@/lib/huaweiOcr";

export async function GET(_: Request, { params }: { params: { orgSlug: string; documentId: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.auditEvent.findFirst({
    where: {
      tenantId: access.membership.organizationId,
      entityType: "Document",
      entityId: params.documentId,
      action: { in: ["OCR_SUCCESS", "OCR_FAILED"] }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!event) {
    return NextResponse.json({ ok: true, ocrStatus: "NOT_RUN" });
  }

  return NextResponse.json({ ok: true, ...(event.metadata as Record<string, unknown>), at: event.createdAt });
}

export async function POST(_: Request, { params }: { params: { orgSlug: string; documentId: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await prisma.document.findFirst({
    where: { id: params.documentId, organizationId: access.membership.organizationId },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  if (!document || !document.versions[0]) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: access.membership.organizationId,
      userId: access.user.id,
      action: "OCR_REQUESTED",
      entityType: "Document",
      entityId: document.id,
      metadata: { ocrStatus: "REQUESTED", versionId: document.versions[0].id }
    }
  });

  const bytes = await getStorageAdapter().getBuffer(document.versions[0].storageKey);
  const result = await runHuaweiGeneralTextOcr({
    base64: bytes.toString("base64"),
    docType: document.type
  });

  if (result.status === "SUCCESS") {
    await prisma.document.update({ where: { id: document.id }, data: { status: "SCAN_OK" } });
    await prisma.auditEvent.create({
      data: {
        tenantId: access.membership.organizationId,
        userId: access.user.id,
        action: "OCR_SUCCESS",
        entityType: "Document",
        entityId: document.id,
        metadata: {
          ocrStatus: "SUCCESS",
          ocrText: result.text,
          ocrJson: result.json,
          ocrError: null
        }
      }
    });

    return NextResponse.json({ ok: true, ocrStatus: "SUCCESS", ocrText: result.text, ocrJson: result.json });
  }

  await prisma.document.update({ where: { id: document.id }, data: { status: "SCAN_FAILED", rejectionReason: result.error ?? "OCR failed" } });
  await prisma.auditEvent.create({
    data: {
      tenantId: access.membership.organizationId,
      userId: access.user.id,
      action: "OCR_FAILED",
      entityType: "Document",
      entityId: document.id,
      metadata: {
        ocrStatus: "FAILED",
        ocrText: "",
        ocrJson: result.json,
        ocrError: result.error ?? "Unknown OCR error"
      }
    }
  });

  return NextResponse.json({ ok: false, ocrStatus: "FAILED", error: result.error ?? "OCR failed" }, { status: 422 });
}
