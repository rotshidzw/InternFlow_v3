import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  getApiUserFromCookie,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";

export async function POST(req: Request, { params }: { params: { itemId: string } }) {
  const actor = await getApiUserFromCookie();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const currentItem = await prisma.checklistItemInstance.findUnique({
    where: { id: params.itemId },
    include: {
      checklist: {
        include: {
          application: {
            include: {
              opportunity: true,
            },
          },
          items: true,
        },
      },
    },
  });

  if (!currentItem) {
    return NextResponse.json({ ok: false, error: "Checklist item not found" }, { status: 404 });
  }

  const orgId = currentItem.checklist.application.opportunity.organizationId;
  const itemOwnerId = currentItem.checklist.application.userId;

  const isOwner = actor.id === itemOwnerId;
  if (!isOwner) {
    const staffMembership = await prisma.membership.findFirst({
      where: { userId: actor.id, organizationId: orgId },
      include: { organization: true },
    });

    const isAllowedStaff = Boolean(
      staffMembership &&
        staffMembership.organization.status === "APPROVED" &&
        isTenantRoleAllowed(staffMembership.role, TENANT_ROLE_GROUPS.CHECKLIST_MANAGE),
    );

    if (!isAllowedStaff) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const item = await prisma.checklistItemInstance.update({
    where: { id: params.itemId },
    data: { status: "DONE", completedAt: new Date() },
    include: { checklist: { include: { items: true } } },
  });

  const total = item.checklist.items.length;
  const done = item.checklist.items.filter((i) => i.status === "DONE").length;
  await prisma.checklistInstance.update({ where: { id: item.checklistId }, data: { progress: Math.round((done / total) * 100) } });

  await prisma.auditEvent.create({
    data: {
      tenantId: orgId,
      userId: actor.id,
      action: "CHECKLIST_ITEM_COMPLETED",
      entityType: "ChecklistItemInstance",
      entityId: item.id,
      metadata: {
        checklistId: item.checklistId,
        completedByOwner: isOwner,
      },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
