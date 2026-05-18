import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  isPersistedTenantRole,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.STAFF_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "COORDINATOR").trim().toUpperCase();

  if (!email) return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff`, req.url));

  if (!TENANT_ROLE_GROUPS.INVITABLE_STAFF.includes(role as any)) {
    return NextResponse.json({ ok: false, error: "Unsupported role assignment" }, { status: 400 });
  }
  if (!isPersistedTenantRole(role)) {
    return NextResponse.json(
      { ok: false, error: "Role is recognized but not enabled in this deployment yet" },
      { status: 400 },
    );
  }

  if (role === "PROVIDER_ADMIN" && actor.actor.membership.role !== "PROVIDER_ADMIN" && actor.actor.membership.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ ok: false, error: "Only provider admins can assign provider admin role" }, { status: 403 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: name || undefined },
    create: { email, name: name || undefined, role },
  });
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: actor.actor.membership.organizationId,
      },
    },
    update: { role },
    create: {
      userId: user.id,
      organizationId: actor.actor.membership.organizationId,
      role,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "STAFF_ROLE_ASSIGNED",
      entityType: "Membership",
      entityId: user.id,
      metadata: { invitedEmail: email, assignedRole: role },
    },
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff`, req.url));
}
