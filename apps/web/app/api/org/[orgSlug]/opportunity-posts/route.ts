import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string } },
) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: params.orgSlug } },
  });
  if (!membership || !ALLOWED_ROLES.has(membership.role)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

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
      tenantId: membership.organizationId,
      title,
      description,
      visibility: visibility as any,
      programmeId,
      closesAt: closesAtRaw ? new Date(closesAtRaw) : null,
      createdByUserId: user.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: membership.organizationId,
      userId: user.id,
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
