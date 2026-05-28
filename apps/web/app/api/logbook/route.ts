import { prisma } from "@internflow/db/src";
import { logbookEntrySchema } from "@internflow/shared/src/schemas";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  bindLogbookEntryToTenant,
  resolveLogbookTenantForStudent,
} from "@/lib/logbook-tenant-binding";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = logbookEntrySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const actor = await getCurrentUser();
  if (!actor) {
    if (!contentType.includes("application/json")) return NextResponse.redirect(new URL("/auth/login", req.url));
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const hasStudentMembership = await prisma.membership.findFirst({
    where: { userId: actor.id, role: "STUDENT" },
    select: { id: true },
  });

  if (actor.role !== "STUDENT" && !hasStudentMembership) {
    return NextResponse.json({ ok: false, error: "Only learners can submit logbooks" }, { status: 403 });
  }

  const requestedOrgSlug =
    typeof payload === "object" && payload !== null && "orgSlug" in payload
      ? String((payload as { orgSlug?: unknown }).orgSlug ?? "")
      : "";
  const resolvedTenant = await resolveLogbookTenantForStudent({
    userId: actor.id,
    requestedOrgSlug,
  });
  if (!resolvedTenant.ok) {
    return NextResponse.json(
      { ok: false, error: resolvedTenant.error },
      { status: resolvedTenant.status },
    );
  }

  const weekStart = new Date(parsed.data.weekStart);
  const entry = await prisma.$transaction(async (tx) => {
    const createdEntry = await tx.logbookEntry.create({
      data: {
        userId: actor.id,
        weekStart,
        summary: parsed.data.summary,
        evidenceKey: parsed.data.evidenceKey
      }
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        orgId: resolvedTenant.organizationId,
        action: "LOGBOOK_SUBMITTED",
        metadata: {
          entryId: createdEntry.id,
          weekStart: parsed.data.weekStart,
          organizationSlug: resolvedTenant.organizationSlug,
          tenantResolutionSource: resolvedTenant.source,
        },
      },
    });

    return createdEntry;
  });

  await bindLogbookEntryToTenant({
    entryId: entry.id,
    organizationId: resolvedTenant.organizationId,
    actorUserId: actor.id,
    weekStart,
  });

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(
      new URL(`/app/student?notice=logbook-submitted&org=${resolvedTenant.organizationSlug}`, req.url),
    );
  }

  return NextResponse.json({
    ok: true,
    entryId: entry.id,
    organizationId: resolvedTenant.organizationId,
    organizationSlug: resolvedTenant.organizationSlug,
  });
}
