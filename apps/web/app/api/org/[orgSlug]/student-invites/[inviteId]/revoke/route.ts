import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; inviteId: string } },
) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.STAFF_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const invite = await prisma.inviteToken.findFirst({
    where: { id: params.inviteId, tenantId: actor.actor.membership.organizationId },
  });

  if (!invite) {
    return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.inviteToken.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(), maxUses: invite.usedCount },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: actor.actor.membership.organizationId,
        userId: actor.actor.user.id,
        action: "INVITE_REVOKED",
        entityType: "InviteToken",
        entityId: invite.id,
        metadata: { token: invite.token },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/intakes`, req.url));
}
