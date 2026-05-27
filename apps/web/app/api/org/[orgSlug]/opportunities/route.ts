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
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const type = String(form.get("type") ?? "INTERNSHIP");
  const status = String(form.get("status") ?? "PUBLISHED");
  const programId = String(form.get("programId") ?? "");
  const requirements = String(form.get("requirements") ?? "");
  const capacity = Math.max(1, Number(form.get("capacity") ?? 50) || 50);

  if (!title || !description) return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/opportunities`, req.url));

  const opportunity = await prisma.opportunity.create({
    data: {
      organizationId: actor.actor.membership.organizationId,
      programId: programId || null,
      title,
      slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      description,
      type: type as any,
      status: status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      capacity,
      requirementsJson: {
        source: "tenant-portal",
        keywords: requirements
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      }
    }
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "OPPORTUNITY_CREATED",
      entityType: "Opportunity",
      entityId: opportunity.id,
      metadata: {
        type,
        status: opportunity.status,
      },
    },
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/opportunities`, req.url));
}
