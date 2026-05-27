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

  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "Program setup").trim();
  const setaCetaName = String(form.get("setaCetaName") ?? "").trim();
  const startDate = new Date(String(form.get("startDate") ?? new Date().toISOString().slice(0, 10)));
  const endDate = new Date(String(form.get("endDate") ?? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)));

  if (!name) return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/programs`, req.url));

  const program = await prisma.program.create({
    data: {
      organizationId: actor.actor.membership.organizationId,
      name,
      description,
      rulesJson: { setaCetaName },
      startDate,
      endDate
    }
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "PROGRAM_CREATED",
      entityType: "Program",
      entityId: program.id,
      metadata: { name, startDate, endDate },
    },
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/programs`, req.url));
}
