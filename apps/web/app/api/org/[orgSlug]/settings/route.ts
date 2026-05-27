import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.SETTINGS_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const logoUrl = String(form.get("logoUrl") ?? "");
  const primaryColor = String(form.get("primaryColor") ?? "#0f766e");
  const allowedDomains = String(form.get("allowedDomains") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const existing = await prisma.settings.findFirst({ where: { organizationId: actor.actor.membership.organizationId, key: "tenant_branding" } });
  const value = { logoUrl, primaryColor, allowedDomains };
  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.settings.create({ data: { organizationId: actor.actor.membership.organizationId, key: "tenant_branding", value } });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "TENANT_SETTINGS_UPDATED",
      entityType: "Settings",
      entityId: existing?.id ?? "tenant_branding",
      metadata: { key: "tenant_branding" },
    },
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/settings`, req.url));
}
