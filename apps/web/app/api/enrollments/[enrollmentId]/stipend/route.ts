import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(req: Request, { params }: { params: { enrollmentId: string } }) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.enrollmentId },
  });
  if (!enrollment) {
    return NextResponse.json({ ok: false, error: "Enrollment not found" }, { status: 404 });
  }

  const actor = await resolveTenantApiActor({
    organizationId: enrollment.organizationId,
    allowedRoles: TENANT_ROLE_GROUPS.STIPEND_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const month = String(form.get("month") ?? "");
  await prisma.enrollment.update({
    where: { id: params.enrollmentId },
    data: { stipendPaid: true, stipendMonth: month || null },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: enrollment.organizationId,
      userId: actor.actor.user.id,
      action: "ENROLLMENT_STIPEND_MARKED_PAID",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: { month: month || null },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
