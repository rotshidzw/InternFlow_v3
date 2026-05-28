import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; documentId: string } },
) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const decision = String(form.get("decision") ?? "");
  const reason = String(form.get("reason") ?? "").trim();

  const document = await prisma.document.findFirst({
    where: {
      id: params.documentId,
      organizationId: actor.actor.membership.organizationId,
    },
  });
  if (!document) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  if (decision !== "approve" && decision !== "return") {
    return NextResponse.json({ ok: false, error: "Unsupported review action" }, { status: 400 });
  }

  const nextStatus = decision === "approve" ? "APPROVED" : "REJECTED";
  const finalReason = decision === "return" ? reason || "Please correct and upload again." : null;

  await prisma.$transaction([
    prisma.document.update({
      where: { id: document.id },
      data: {
        status: nextStatus,
        rejectionReason: finalReason,
      },
    }),
    prisma.notification.create({
      data: {
        userId: document.userId,
        title: decision === "approve" ? "Document approved" : "Document returned for correction",
        body:
          decision === "approve"
            ? `Your ${document.type} was approved.`
            : `Your ${document.type} needs updates: ${finalReason}`,
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: actor.actor.membership.organizationId,
        userId: actor.actor.user.id,
        action: decision === "approve" ? "DOCUMENT_APPROVED" : "DOCUMENT_RETURNED",
        entityType: "Document",
        entityId: document.id,
        metadata: { reason: finalReason, documentType: document.type },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/documents`, req.url));
}
