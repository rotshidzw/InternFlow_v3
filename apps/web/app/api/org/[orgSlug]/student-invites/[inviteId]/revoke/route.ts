import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requireTenantApiActor } from "@/lib/tenant-api-auth";

const ALLOWED_ROLES = ["PROVIDER_ADMIN", "COORDINATOR"] as const;

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; inviteId: string } },
) {
  const actor = await requireTenantApiActor(params.orgSlug, [...ALLOWED_ROLES]);
  if (!actor) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const invite = await prisma.inviteToken.findFirst({
    where: { id: params.inviteId, tenantId: actor.membership.organizationId },
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
        tenantId: actor.membership.organizationId,
        userId: actor.user.id,
        action: "INVITE_REVOKED",
        entityType: "InviteToken",
        entityId: invite.id,
        metadata: { token: invite.token },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/intakes`, req.url));
}
