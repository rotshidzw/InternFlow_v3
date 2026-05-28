import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const APPROVAL_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);
const REVIEWER_ROLES = [
  "SUPERVISOR",
  "COORDINATOR",
  "PROVIDER_ADMIN",
  "TRAINER",
  "FACILITATOR",
  "SYSTEM_ADMIN",
] as const;

export async function POST(req: Request) {
  const formData = await req.formData();
  const entryId = String(formData.get("entryId") ?? "").trim();
  const status = String(formData.get("status") ?? "PENDING").trim().toUpperCase();
  const comment = String(formData.get("comment") ?? "");
  const actor = await getCurrentUser();

  if (!entryId) return NextResponse.json({ ok: false, error: "entryId is required" }, { status: 400 });
  if (!APPROVAL_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid approval status" }, { status: 400 });
  }
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const reviewerMemberships = await prisma.membership.findMany({
    where: {
      userId: actor.id,
      role: { in: [...REVIEWER_ROLES] },
      organization: { status: "APPROVED" },
    },
    select: { organizationId: true, organization: { select: { slug: true } } },
  });

  if (reviewerMemberships.length === 0) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const entry = await prisma.logbookEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      user: {
        select: {
          memberships: {
            select: { organizationId: true },
          },
        },
      },
    },
  });

  if (!entry) return NextResponse.json({ ok: false, error: "Logbook entry not found" }, { status: 404 });

  const memberOrgIds = new Set(reviewerMemberships.map((membership) => membership.organizationId));
  const sharedMembership = entry.user.memberships.find((membership) => memberOrgIds.has(membership.organizationId));
  if (!sharedMembership) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const reviewerOrg = reviewerMemberships.find(
    (membership) => membership.organizationId === sharedMembership.organizationId,
  );

  await prisma.logbookApproval.create({
    data: { entryId, reviewerId: actor.id, status, comment },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: sharedMembership.organizationId,
      userId: actor.id,
      action: "LOGBOOK_REVIEW_SUBMITTED",
      entityType: "LogbookEntry",
      entityId: entryId,
      metadata: { status, comment },
    },
  });

  const redirectTarget = reviewerOrg?.organization.slug
    ? `/org/${reviewerOrg.organization.slug}/app/logbooks`
    : "/workspaces";
  return NextResponse.redirect(new URL(redirectTarget, req.url));
}
