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
    allowedRoles: TENANT_ROLE_GROUPS.CONTENT_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const templateId = String(form.get("templateId") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const type = String(form.get("type") ?? "CHECKLIST");
  const status = String(form.get("status") ?? "DRAFT");
  const setaCetaName = String(form.get("setaCetaName") ?? "").trim();
  const jsonRaw = String(form.get("json") ?? "{}");

  let parsedJson: unknown = {};
  try {
    parsedJson = JSON.parse(jsonRaw);
  } catch {
    parsedJson = {};
  }

  const value = { name, type, status, setaCetaName, config: parsedJson };

  if (templateId) {
    await prisma.settings.updateMany({
      where: { id: templateId, organizationId: actor.actor.membership.organizationId, key: { startsWith: "template_" } },
      data: { value }
    });
  } else {
    await prisma.settings.create({
      data: {
        organizationId: actor.actor.membership.organizationId,
        key: `template_${Date.now()}`,
        value
      }
    });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "TEMPLATE_SAVED",
      entityType: "Settings",
      entityId: templateId || "new_template",
      metadata: { name, type, status },
    },
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/templates`, req.url));
}
