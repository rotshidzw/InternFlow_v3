import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const APPROVAL_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

export async function POST(req: Request, { params }: { params: { orgSlug: string; entryId: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const status = String(form.get("status") ?? "APPROVED").trim().toUpperCase();
  const comment = String(form.get("comment") ?? "");
  if (!APPROVAL_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid approval status" }, { status: 400 });
  }

  const entry = await prisma.logbookEntry.findFirst({
    where: {
      id: params.entryId,
      user: {
        memberships: {
          some: { organizationId: actor.actor.membership.organizationId },
        },
      },
    },
    select: { id: true, userId: true },
  });

  if (!entry) {
    return NextResponse.json({ ok: false, error: "Logbook entry not found" }, { status: 404 });
  }

  await prisma.logbookApproval.create({
    data: {
      entryId: params.entryId,
      reviewerId: actor.actor.user.id,
      status,
      comment,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "LOGBOOK_REVIEW_SUBMITTED",
      entityType: "LogbookEntry",
      entityId: params.entryId,
      metadata: {
        status,
        comment,
      },
    },
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/logbooks`, req.url));
}
