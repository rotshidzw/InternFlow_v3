import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { runHuaweiGeneralTextOcr } from "@/lib/huaweiOcr";
import type { Prisma } from "@prisma/client";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

function toJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined) return null;
  return value as Prisma.InputJsonValue;
}

export async function GET(_: Request, { params }: { params: { orgSlug: string; documentId: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const event = await prisma.auditEvent.findFirst({
    where: {
      tenantId: actor.actor.membership.organizationId,
      entityType: "Document",
      entityId: params.documentId,
      action: { in: ["OCR_SUCCESS", "OCR_FAILED"] }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!event) {
    return NextResponse.json({ ok: true, ocrStatus: "NOT_RUN" });
  }

  const metadata =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as Record<string, unknown>)
      : {};

  return NextResponse.json({ ok: true, ...metadata, at: event.createdAt });
}

export async function POST(_: Request, { params }: { params: { orgSlug: string; documentId: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.CHECKLIST_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const document = await prisma.document.findFirst({
    where: { id: params.documentId, organizationId: actor.actor.membership.organizationId },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  if (!document || !document.versions[0]) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
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
        tenantId: actor.actor.membership.organizationId,
        userId: actor.actor.user.id,
        action: "OCR_SUCCESS",
        entityType: "Document",
        entityId: document.id,
        metadata: {
          ocrStatus: "SUCCESS",
          ocrText: result.text,
          ocrJson: toJsonValue(result.json),
          ocrError: null
        }
      }
    });

    return NextResponse.json({ ok: true, ocrStatus: "SUCCESS", ocrText: result.text, ocrJson: result.json });
  }

  await prisma.document.update({ where: { id: document.id }, data: { status: "SCAN_FAILED", rejectionReason: result.error ?? "OCR failed" } });
  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "OCR_FAILED",
      entityType: "Document",
      entityId: document.id,
      metadata: {
        ocrStatus: "FAILED",
        ocrText: "",
        ocrJson: toJsonValue(result.json),
        ocrError: result.error ?? "Unknown OCR error"
      }
    }
  });

  return NextResponse.json({ ok: false, ocrStatus: "FAILED", error: result.error ?? "OCR failed" }, { status: 422 });
}
