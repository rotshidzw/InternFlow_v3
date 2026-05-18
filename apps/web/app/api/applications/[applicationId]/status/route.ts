import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const schema = z.object({ status: z.enum(["SHORTLISTED", "ACCEPTED", "REJECTED"]) });

export async function POST(req: Request, { params }: { params: { applicationId: string } }) {
  const payload = Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: { opportunity: true },
  });

  if (!application) {
    return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
  }

  const actor = await resolveTenantApiActor({
    organizationId: application.opportunity.organizationId,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const previousStatus = application.status;
  const updatedApplication = await prisma.application.update({
    where: { id: params.applicationId },
    data: { status: parsed.data.status },
    include: { opportunity: true },
  });

  if (parsed.data.status === "ACCEPTED") {
    const existing = await prisma.enrollment.findFirst({
      where: {
        userId: updatedApplication.userId,
        organizationId: updatedApplication.opportunity.organizationId,
      },
    });
    if (!existing && updatedApplication.opportunity.programId) {
      await prisma.enrollment.create({
        data: {
          organizationId: updatedApplication.opportunity.organizationId,
          userId: updatedApplication.userId,
          programId: updatedApplication.opportunity.programId,
          status: "PENDING",
        },
      });
    }
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: updatedApplication.opportunity.organizationId,
      userId: actor.actor.user.id,
      action: "APPLICATION_STATUS_UPDATED",
      entityType: "Application",
      entityId: updatedApplication.id,
      metadata: {
        previousStatus,
        nextStatus: parsed.data.status,
      },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
