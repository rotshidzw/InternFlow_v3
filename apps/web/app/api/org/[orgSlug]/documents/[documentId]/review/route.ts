import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requireTenantApiActor } from "@/lib/tenant-api-auth";

const ALLOWED_ROLES = ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] as const;

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; documentId: string } },
) {
  const actor = await requireTenantApiActor(params.orgSlug, [...ALLOWED_ROLES]);
  if (!actor) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const decision = String(form.get("decision") ?? "");
  const reason = String(form.get("reason") ?? "").trim();

  const tenantUserIds = await prisma.membership.findMany({
    where: { organizationId: actor.membership.organizationId },
    select: { userId: true },
  });

  const document = await prisma.document.findFirst({
    where: { id: params.documentId, userId: { in: tenantUserIds.map((m) => m.userId) } },
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
        tenantId: actor.membership.organizationId,
        userId: actor.user.id,
        action: decision === "approve" ? "DOCUMENT_APPROVED" : "DOCUMENT_RETURNED",
        entityType: "Document",
        entityId: document.id,
        metadata: { reason: finalReason, documentType: document.type },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/documents`, req.url));
}
