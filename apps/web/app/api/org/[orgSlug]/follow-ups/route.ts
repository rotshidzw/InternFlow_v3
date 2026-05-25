import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import {
  FOLLOW_UP_OUTCOMES,
  FOLLOW_UP_STATUSES,
  loadOrganizationFollowUpRecords,
  saveOrganizationFollowUpRecords,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function GET(_: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const records = await loadOrganizationFollowUpRecords(
    actor.actor.membership.organizationId,
  );
  return NextResponse.json({ ok: true, records });
}

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const recordId = String(form.get("recordId") ?? "").trim();
  const outcomeRaw = String(form.get("outcome") ?? "").trim().toUpperCase();
  const statusRaw = String(form.get("status") ?? "COMPLETED").trim().toUpperCase();
  const notes = String(form.get("outcomeNotes") ?? "").trim();
  const evidenceFile = form.get("evidenceFile");

  if (!recordId) {
    return NextResponse.json({ ok: false, error: "recordId is required" }, { status: 400 });
  }
  if (!FOLLOW_UP_STATUSES.includes(statusRaw as (typeof FOLLOW_UP_STATUSES)[number])) {
    return NextResponse.json({ ok: false, error: "invalid follow-up status" }, { status: 400 });
  }
  if (
    outcomeRaw &&
    !FOLLOW_UP_OUTCOMES.includes(outcomeRaw as (typeof FOLLOW_UP_OUTCOMES)[number])
  ) {
    return NextResponse.json({ ok: false, error: "invalid outcome" }, { status: 400 });
  }

  const orgId = actor.actor.membership.organizationId;
  const records = await loadOrganizationFollowUpRecords(orgId);
  const targetIndex = records.findIndex((record) => record.id === recordId);
  if (targetIndex < 0) {
    return NextResponse.json({ ok: false, error: "follow-up record not found" }, { status: 404 });
  }

  const target = records[targetIndex];
  let evidenceDocumentId: string | null = null;
  const nextOutcome = outcomeRaw
    ? (outcomeRaw as (typeof FOLLOW_UP_OUTCOMES)[number])
    : target.outcome;

  if (evidenceFile instanceof File) {
    const storageKey = `follow-up/${orgId}/${target.enrollmentId}/${target.dueMonth}m/${Date.now()}-${evidenceFile.name}`;
    await getStorageAdapter().put(
      storageKey,
      Buffer.from(await evidenceFile.arrayBuffer()),
      evidenceFile.type || "application/octet-stream",
    );

    const evidenceDocument = await prisma.document.create({
      data: {
        userId: target.userId,
        organizationId: orgId,
        type: "FOLLOW_UP_EVIDENCE",
        status: "SUBMITTED",
        versions: {
          create: {
            storageKey,
            mimeType: evidenceFile.type || "application/octet-stream",
            sizeBytes: evidenceFile.size,
          },
        },
      },
      select: { id: true },
    });
    evidenceDocumentId = evidenceDocument.id;

    await prisma.auditEvent.create({
      data: {
        tenantId: orgId,
        userId: actor.actor.user.id,
        action: "FOLLOW_UP_EVIDENCE_UPLOADED",
        entityType: "Document",
        entityId: evidenceDocument.id,
        metadata: { followUpId: target.id, dueMonth: target.dueMonth },
      },
    });
  }

  const nextStatus = statusRaw as (typeof FOLLOW_UP_STATUSES)[number];
  const nowIso = new Date().toISOString();
  const updated = {
    ...target,
    status: nextStatus,
    outcome: nextOutcome,
    outcomeNotes: notes || target.outcomeNotes,
    evidenceDocumentIds: [
      ...target.evidenceDocumentIds,
      ...(evidenceDocumentId ? [evidenceDocumentId] : []),
    ],
    completedAt: nextStatus === "COMPLETED" ? nowIso : target.completedAt,
    completedByUserId:
      nextStatus === "COMPLETED" ? actor.actor.user.id : target.completedByUserId,
    updatedAt: nowIso,
    updatedByUserId: actor.actor.user.id,
  };

  records[targetIndex] = updated;
  await saveOrganizationFollowUpRecords(orgId, records);

  if (nextStatus === "COMPLETED" && target.status !== "COMPLETED") {
    await prisma.auditEvent.create({
      data: {
        tenantId: orgId,
        userId: actor.actor.user.id,
        action: "FOLLOW_UP_COMPLETED",
        entityType: "FollowUp",
        entityId: updated.id,
        metadata: {
          dueMonth: updated.dueMonth,
          dueDate: updated.dueDate,
          outcome: updated.outcome,
        },
      },
    });
  }

  if (updated.outcome && updated.outcome !== target.outcome) {
    await prisma.auditEvent.create({
      data: {
        tenantId: orgId,
        userId: actor.actor.user.id,
        action: "OUTCOME_UPDATED",
        entityType: "FollowUp",
        entityId: updated.id,
        metadata: {
          dueMonth: updated.dueMonth,
          outcome: updated.outcome,
          notes: updated.outcomeNotes,
        },
      },
    });
  }

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
