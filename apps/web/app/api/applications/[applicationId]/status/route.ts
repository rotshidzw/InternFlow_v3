import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const schema = z.object({
  status: z.enum(["REVIEW", "SHORTLISTED", "ACCEPTED", "REJECTED"]),
});

const REVIEWABLE_SOURCE_STATUSES = ["APPLIED", "SUBMITTED", "REVIEW", "SHORTLISTED"] as const;

function canTransition(currentStatus: string, nextStatus: string) {
  const current = currentStatus.toUpperCase();
  const next = nextStatus.toUpperCase();
  if (current === next) return true;
  if (next === "REVIEW") return REVIEWABLE_SOURCE_STATUSES.includes(current as any);
  if (next === "SHORTLISTED") return REVIEWABLE_SOURCE_STATUSES.includes(current as any);
  if (next === "ACCEPTED") return ["SUBMITTED", "REVIEW", "SHORTLISTED"].includes(current);
  if (next === "REJECTED") return ["DRAFT", "APPLIED", "SUBMITTED", "REVIEW", "SHORTLISTED"].includes(current);
  return false;
}

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

  if (!canTransition(application.status, parsed.data.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid transition from ${application.status} to ${parsed.data.status}`,
      },
      { status: 409 },
    );
  }

  const previousStatus = application.status;
  const updatedApplication = await prisma.application.update({
    where: { id: params.applicationId },
    data: {
      status: parsed.data.status,
      submittedAt: parsed.data.status === "REJECTED" ? application.submittedAt : application.submittedAt ?? new Date(),
    },
    include: { opportunity: true },
  });

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
        placementChanged: false,
      },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
