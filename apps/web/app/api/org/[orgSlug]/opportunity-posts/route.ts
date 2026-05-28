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
    allowedRoles: TENANT_ROLE_GROUPS.CONTENT_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const visibility = String(form.get("visibility") ?? "TENANT_ONLY");
  const programmeId = String(form.get("programmeId") ?? "").trim() || null;
  const closesAtRaw = String(form.get("closesAt") ?? "").trim();

  if (!title || !description) {
    return NextResponse.redirect(
      new URL(
        `/org/${params.orgSlug}/coordinator?error=missing-fields`,
        req.url,
      ),
    );
  }

  const post = await prisma.opportunityPost.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      title,
      description,
      visibility: visibility as any,
      programmeId,
      closesAt: closesAtRaw ? new Date(closesAtRaw) : null,
      createdByUserId: actor.actor.user.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "OPPORTUNITY_POST_CREATED",
      entityType: "OpportunityPost",
      entityId: post.id,
      metadata: { visibility, programmeId },
    },
  });

  return NextResponse.redirect(
    new URL(`/org/${params.orgSlug}/coordinator?createdPost=1`, req.url),
  );
}
