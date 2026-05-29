import { prisma } from "@internflow/db/src";

const LOGBOOK_ENTITY_TYPE = "LogbookEntry";
const LOGBOOK_SUBMITTED_ACTION = "LOGBOOK_SUBMITTED";

type ResolveLogbookTenantResult =
  | {
      ok: true;
      organizationId: string;
      organizationSlug: string;
      source: "requested_org" | "active_enrollment" | "single_membership";
    }
  | { ok: false; status: 403 | 409; error: string };

export async function resolveLogbookTenantForStudent(args: {
  userId: string;
  requestedOrgSlug?: string | null;
}): Promise<ResolveLogbookTenantResult> {
  const memberships = await prisma.membership.findMany({
    where: {
      userId: args.userId,
      role: "STUDENT",
      organization: { status: "APPROVED" },
    },
    include: { organization: true },
  });

  const requestedOrgSlug = args.requestedOrgSlug?.trim().toLowerCase() ?? "";
  if (requestedOrgSlug) {
    const matchedMembership = memberships.find(
      (membership) => membership.organization.slug.toLowerCase() === requestedOrgSlug,
    );
    if (!matchedMembership) {
      return {
        ok: false,
        status: 403,
        error: "You are not a learner member of the selected organization.",
      };
    }
    return {
      ok: true,
      organizationId: matchedMembership.organizationId,
      organizationSlug: matchedMembership.organization.slug,
      source: "requested_org",
    };
  }

  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: args.userId,
      status: { in: ["PENDING", "ACTIVE", "COMPLETED"] },
      organization: { status: "APPROVED" },
    },
    include: { organization: true },
    orderBy: { id: "desc" },
  });

  if (activeEnrollment) {
    return {
      ok: true,
      organizationId: activeEnrollment.organizationId,
      organizationSlug: activeEnrollment.organization.slug,
      source: "active_enrollment",
    };
  }

  if (memberships.length === 1) {
    return {
      ok: true,
      organizationId: memberships[0].organizationId,
      organizationSlug: memberships[0].organization.slug,
      source: "single_membership",
    };
  }

  if (memberships.length === 0) {
    return {
      ok: false,
      status: 409,
      error: "No approved learner workspace found. Contact support to restore workspace membership.",
    };
  }

  return {
    ok: false,
    status: 409,
    error:
      "Multiple learner workspaces found. Submit from an organization workspace so logbook ownership stays tenant-bound.",
  };
}

export async function bindLogbookEntryToTenant(args: {
  entryId: string;
  organizationId: string;
  actorUserId: string;
  weekStart: Date;
}) {
  const existingBinding = await prisma.auditEvent.findFirst({
    where: {
      tenantId: args.organizationId,
      entityType: LOGBOOK_ENTITY_TYPE,
      entityId: args.entryId,
      action: LOGBOOK_SUBMITTED_ACTION,
    },
    select: { id: true },
  });

  if (existingBinding) return;

  await prisma.auditEvent.create({
    data: {
      tenantId: args.organizationId,
      userId: args.actorUserId,
      action: LOGBOOK_SUBMITTED_ACTION,
      entityType: LOGBOOK_ENTITY_TYPE,
      entityId: args.entryId,
      metadata: {
        weekStart: args.weekStart.toISOString().slice(0, 10),
      },
    },
  });
}

async function backfillLegacyBinding(args: {
  entryId: string;
  organizationId: string;
  actorUserId: string;
  weekStart?: Date | null;
}) {
  await prisma.auditEvent.create({
    data: {
      tenantId: args.organizationId,
      userId: args.actorUserId,
      action: LOGBOOK_SUBMITTED_ACTION,
      entityType: LOGBOOK_ENTITY_TYPE,
      entityId: args.entryId,
      metadata: {
        source: "legacy_backfill",
        weekStart: args.weekStart ? args.weekStart.toISOString().slice(0, 10) : null,
      },
    },
  });
}

export async function resolveTenantBoundLogbookEntry(args: {
  entryId: string;
  organizationIds?: string[];
}) {
  const binding = await prisma.auditEvent.findFirst({
    where: {
      entityType: LOGBOOK_ENTITY_TYPE,
      entityId: args.entryId,
      action: LOGBOOK_SUBMITTED_ACTION,
      ...(args.organizationIds && args.organizationIds.length > 0
        ? { tenantId: { in: args.organizationIds } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { tenantId: true },
  });

  if (binding?.tenantId) return { organizationId: binding.tenantId };

  if (!args.organizationIds?.length) return null;

  const legacyEntry = await prisma.logbookEntry.findUnique({
    where: { id: args.entryId },
    select: {
      id: true,
      userId: true,
      weekStart: true,
      user: {
        select: {
          enrollments: {
            where: { organizationId: { in: args.organizationIds } },
            select: { organizationId: true },
          },
        },
      },
    },
  });
  if (!legacyEntry) return null;

  const candidateOrgIds = Array.from(
    new Set(legacyEntry.user.enrollments.map((enrollment) => enrollment.organizationId)),
  );
  if (candidateOrgIds.length !== 1) return null;

  await backfillLegacyBinding({
    entryId: legacyEntry.id,
    organizationId: candidateOrgIds[0],
    actorUserId: legacyEntry.userId,
    weekStart: legacyEntry.weekStart,
  });
  return { organizationId: candidateOrgIds[0] };
}

export async function listTenantBoundLogbookEntryIds(
  organizationId: string,
  take = 5_000,
) {
  const bindings = await prisma.auditEvent.findMany({
    where: {
      tenantId: organizationId,
      entityType: LOGBOOK_ENTITY_TYPE,
      action: LOGBOOK_SUBMITTED_ACTION,
    },
    select: { entityId: true },
    orderBy: { createdAt: "desc" },
    take,
  });

  const dedupe = (rows: { entityId: string }[]) => {
    const uniqueIds: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.entityId || seen.has(row.entityId)) continue;
      seen.add(row.entityId);
      uniqueIds.push(row.entityId);
    }
    return uniqueIds;
  };

  const boundIds = dedupe(bindings);
  if (boundIds.length > 0) return boundIds;

  const legacyEntries = await prisma.logbookEntry.findMany({
    where: {
      user: {
        enrollments: {
          some: {
            organizationId,
            status: { in: ["PENDING", "ACTIVE", "COMPLETED"] },
            organization: { status: "APPROVED" },
          },
        },
      },
    },
    select: {
      id: true,
      userId: true,
      weekStart: true,
      user: {
        select: {
          enrollments: {
            where: {
              status: { in: ["PENDING", "ACTIVE", "COMPLETED"] },
              organization: { status: "APPROVED" },
            },
            select: { organizationId: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const safeEntryIds: string[] = [];
  let ambiguousCount = 0;

  for (const entry of legacyEntries) {
    const candidateOrgIds = Array.from(
      new Set(entry.user.enrollments.map((enrollment) => enrollment.organizationId)),
    );
    if (candidateOrgIds.length !== 1 || candidateOrgIds[0] !== organizationId) {
      ambiguousCount += 1;
      continue;
    }

    safeEntryIds.push(entry.id);
    await backfillLegacyBinding({
      entryId: entry.id,
      organizationId,
      actorUserId: entry.userId,
      weekStart: entry.weekStart,
    }).catch(() => null);
  }

  if (ambiguousCount > 0) {
    console.warn(
      `[logbook-tenant-binding] Skipped ${ambiguousCount} legacy entries for org ${organizationId} due to ambiguous tenant ownership.`,
    );
  }

  return safeEntryIds;
}
