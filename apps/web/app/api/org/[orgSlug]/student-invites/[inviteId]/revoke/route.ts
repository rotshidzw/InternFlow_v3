import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; inviteId: string } },
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

  const invite = await prisma.inviteToken.findFirst({
    where: { id: params.inviteId, tenantId: membership.organizationId },
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
        tenantId: membership.organizationId,
        userId: user.id,
        action: "INVITE_REVOKED",
        entityType: "InviteToken",
        entityId: invite.id,
        metadata: { token: invite.token },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/intakes`, req.url));
}
