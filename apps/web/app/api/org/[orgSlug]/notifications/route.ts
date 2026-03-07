import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requireTenantApiActor } from "@/lib/tenant-api-auth";

const ALLOWED_ROLES = ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] as const;

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string } },
) {
  const actor = await requireTenantApiActor(params.orgSlug, [...ALLOWED_ROLES]);
  if (!actor) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const userId = String(form.get("userId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();

  if (!userId || !title || !body) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const receiverMembership = await prisma.membership.findFirst({
    where: { userId, organizationId: actor.membership.organizationId, role: "STUDENT" },
  });

  if (!receiverMembership) {
    return NextResponse.json({ ok: false, error: "User not in tenant" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.notification.create({ data: { userId, title, body } }),
    prisma.auditEvent.create({
      data: {
        tenantId: actor.membership.organizationId,
        userId: actor.user.id,
        action: "NOTIFICATION_SENT",
        entityType: "User",
        entityId: userId,
        metadata: { title },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/notifications`, req.url));
}
