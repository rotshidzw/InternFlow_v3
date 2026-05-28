import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string } },
) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const userId = String(form.get("userId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();

  if (!userId || !title || !body) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const receiverMembership = await prisma.membership.findFirst({
    where: { userId, organizationId: actor.actor.membership.organizationId, role: "STUDENT" },
  });

  if (!receiverMembership) {
    return NextResponse.json({ ok: false, error: "User not in tenant" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.notification.create({ data: { userId, title, body } }),
    prisma.auditEvent.create({
      data: {
        tenantId: actor.actor.membership.organizationId,
        userId: actor.actor.user.id,
        action: "NOTIFICATION_SENT",
        entityType: "User",
        entityId: userId,
        metadata: { title },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/notifications`, req.url));
}
