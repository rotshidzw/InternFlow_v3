import { prisma } from "@internflow/db/src";
import { deterministicSummary } from "@internflow/shared/src/ai/summary";
import { getChecklist, getRecentActions, getUserStatus, listMissingDocs } from "@/lib/ai-tools";
import {
  TENANT_ROLE_GROUPS,
  getApiUserFromCookie,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const actor = await getApiUserFromCookie();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tenantIdForAudit: string | null = null;
  let allowed = actor.id === userId || actor.role === "SYSTEM_ADMIN";

  if (!allowed) {
    const sharedMembership = await prisma.membership.findFirst({
      where: {
        userId: actor.id,
        organization: {
          status: "APPROVED",
          memberships: { some: { userId } },
        },
      },
      select: { organizationId: true, role: true },
    });

    allowed = Boolean(
      sharedMembership &&
        isTenantRoleAllowed(sharedMembership.role, TENANT_ROLE_GROUPS.EXPORT_READ),
    );
    tenantIdForAudit = sharedMembership?.organizationId ?? null;
  }

  if (!allowed) {
    console.warn("[tickets-summary] forbidden access attempt", {
      actorUserId: actor.id,
      targetUserId: userId,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!tenantIdForAudit) {
    const targetMembership = await prisma.membership.findFirst({
      where: { userId },
      select: { organizationId: true },
    });
    tenantIdForAudit = targetMembership?.organizationId ?? null;
  }

  const summary = deterministicSummary({
    userStatus: await getUserStatus(userId),
    missingDocs: await listMissingDocs(userId),
    checklist: await getChecklist(userId),
    recentActions: await getRecentActions(userId),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: tenantIdForAudit,
      userId: actor.id,
      action: "TICKET_SUMMARY_VIEWED",
      entityType: "User",
      entityId: userId,
      metadata: {
        self: actor.id === userId,
      },
    },
  });

  return NextResponse.json({ summary });
}
