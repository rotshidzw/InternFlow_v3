import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"]);

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; documentId: string } },
) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: params.orgSlug } },
  });

  if (!membership || !ALLOWED_ROLES.has(membership.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const decision = String(form.get("decision") ?? "");
  const reason = String(form.get("reason") ?? "").trim();

  const document = await prisma.document.findUnique({ where: { id: params.documentId } });
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
        tenantId: membership.organizationId,
        userId: user.id,
        action: decision === "approve" ? "DOCUMENT_APPROVED" : "DOCUMENT_RETURNED",
        entityType: "Document",
        entityId: document.id,
        metadata: { reason: finalReason, documentType: document.type },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/documents`, req.url));
}
