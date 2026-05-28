import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  if (value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toInputJson(item));
  }
  if (typeof value === "object") {
    const obj: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      obj[key] = toInputJson(nested);
    }
    return obj as Prisma.InputJsonObject;
  }
  return String(value);
}

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

  const value: Prisma.InputJsonObject = {
    name,
    type,
    status,
    setaCetaName,
    config: toInputJson(parsedJson),
  };

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
