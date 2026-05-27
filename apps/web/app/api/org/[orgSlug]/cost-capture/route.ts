import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import {
  COST_CATEGORIES,
  COST_STATUSES,
  loadOrganizationCostCaptureRecords,
  saveOrganizationCostCaptureRecords,
  type CostCaptureRecord,
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

  const records = await loadOrganizationCostCaptureRecords(
    actor.actor.membership.organizationId,
  );
  return NextResponse.json({ ok: true, records });
}

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.STIPEND_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const recordIdRaw = String(form.get("recordId") ?? "").trim();
  const programmeIdRaw = String(form.get("programmeId") ?? "").trim();
  const month = String(form.get("month") ?? "").trim();
  const category = String(form.get("category") ?? "").trim().toUpperCase();
  const status = String(form.get("status") ?? "SUBMITTED").trim().toUpperCase();
  const amountRaw = String(form.get("amount") ?? "").trim();
  const notesRaw = String(form.get("notes") ?? "").trim();
  const evidenceFile = form.get("evidenceFile");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ ok: false, error: "month must be YYYY-MM" }, { status: 400 });
  }
  if (!COST_CATEGORIES.includes(category as (typeof COST_CATEGORIES)[number])) {
    return NextResponse.json({ ok: false, error: "invalid category" }, { status: 400 });
  }
  if (!COST_STATUSES.includes(status as (typeof COST_STATUSES)[number])) {
    return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ ok: false, error: "amount must be 0 or more" }, { status: 400 });
  }

  let evidenceDocumentId: string | null = null;
  if (evidenceFile instanceof File) {
    const storageKey = `cost-capture/${actor.actor.membership.organizationId}/${month}/${Date.now()}-${evidenceFile.name}`;
    await getStorageAdapter().put(
      storageKey,
      Buffer.from(await evidenceFile.arrayBuffer()),
      evidenceFile.type || "application/octet-stream",
    );

    const evidence = await prisma.organizationDocument.create({
      data: {
        orgId: actor.actor.membership.organizationId,
        category: "COST_CAPTURE_EVIDENCE",
        fileKey: storageKey,
        status: "PENDING_REVIEW",
        notes: JSON.stringify({
          month,
          category,
          uploadedByUserId: actor.actor.user.id,
          uploadedByEmail: actor.actor.user.email,
        }),
      },
      select: { id: true },
    });
    evidenceDocumentId = evidence.id;

    await prisma.auditEvent.create({
      data: {
        tenantId: actor.actor.membership.organizationId,
        userId: actor.actor.user.id,
        action: "COST_CAPTURE_EVIDENCE_UPLOADED",
        entityType: "OrganizationDocument",
        entityId: evidence.id,
        metadata: { month, category },
      },
    });
  }

  const records = await loadOrganizationCostCaptureRecords(
    actor.actor.membership.organizationId,
  );
  const existingIndex = records.findIndex(
    (record) =>
      (recordIdRaw && record.id === recordIdRaw) ||
      (record.month === month &&
        record.category === category &&
        record.programmeId === (programmeIdRaw || null)),
  );
  const existing = existingIndex >= 0 ? records[existingIndex] : null;

  const nextRecord: CostCaptureRecord = {
    id: existing?.id ?? `${month}:${category}:${programmeIdRaw || "general"}`,
    programmeId: programmeIdRaw || null,
    month,
    category: category as CostCaptureRecord["category"],
    amount,
    status: status as CostCaptureRecord["status"],
    evidenceDocumentIds: [
      ...(existing?.evidenceDocumentIds ?? []),
      ...(evidenceDocumentId ? [evidenceDocumentId] : []),
    ],
    notes: notesRaw || null,
    updatedAt: new Date().toISOString(),
    updatedByUserId: actor.actor.user.id,
  };

  if (existingIndex >= 0) {
    records[existingIndex] = nextRecord;
  } else {
    records.push(nextRecord);
  }
  await saveOrganizationCostCaptureRecords(
    actor.actor.membership.organizationId,
    records,
  );

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: existing ? "COST_CAPTURE_UPDATED" : "COST_CAPTURE_SUBMITTED",
      entityType: "Settings",
      entityId: nextRecord.id,
      metadata: {
        month,
        category,
        amount,
        status,
        programmeId: programmeIdRaw || null,
      },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
