import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import {
  STIPEND_PAYMENT_STATUSES,
  loadOrganizationStipendRecords,
  saveOrganizationStipendRecords,
  type StipendPaymentRecord,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(req: Request, { params }: { params: { enrollmentId: string } }) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.enrollmentId },
  });
  if (!enrollment) {
    return NextResponse.json({ ok: false, error: "Enrollment not found" }, { status: 404 });
  }

  const actor = await resolveTenantApiActor({
    organizationId: enrollment.organizationId,
    allowedRoles: TENANT_ROLE_GROUPS.STIPEND_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const month = String(form.get("month") ?? "").trim();
  const paymentStatus = String(form.get("paymentStatus") ?? (form.has("paymentStatus") ? "DUE" : "PAID"))
    .trim()
    .toUpperCase();
  const eligibleRaw = String(form.get("eligible") ?? "true")
    .trim()
    .toLowerCase();
  const exceptionReasonRaw = String(form.get("exceptionReason") ?? "")
    .trim();
  const stipendAmountRaw = String(form.get("stipendAmount") ?? "")
    .trim();
  const recordIdRaw = String(form.get("recordId") ?? "")
    .trim();
  const payslipFile = form.get("payslipFile");
  const proofFile = form.get("proofFile");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ ok: false, error: "month must be YYYY-MM" }, { status: 400 });
  }

  if (
    !STIPEND_PAYMENT_STATUSES.includes(
      paymentStatus as (typeof STIPEND_PAYMENT_STATUSES)[number],
    )
  ) {
    return NextResponse.json({ ok: false, error: "invalid paymentStatus" }, { status: 400 });
  }

  const eligible = eligibleRaw !== "false";
  const stipendAmount =
    stipendAmountRaw === "" ? null : Number.isFinite(Number(stipendAmountRaw)) ? Number(stipendAmountRaw) : null;
  if (stipendAmountRaw !== "" && stipendAmount === null) {
    return NextResponse.json({ ok: false, error: "invalid stipendAmount" }, { status: 400 });
  }

  const storage = getStorageAdapter();
  const uploadedPayslipIds: string[] = [];
  const uploadedProofIds: string[] = [];

  const uploadDocument = async (
    file: FormDataEntryValue | null,
    type: "PAYSLIP" | "PROOF_OF_PAYMENT",
  ) => {
    if (!(file instanceof File)) return null;

    const storageKey = `payments/${enrollment.organizationId}/${enrollment.id}/${month}/${Date.now()}-${file.name}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await storage.put(storageKey, bytes, file.type || "application/octet-stream");

    const document = await prisma.document.create({
      data: {
        userId: enrollment.userId,
        organizationId: enrollment.organizationId,
        type,
        status: "SUBMITTED",
        versions: {
          create: {
            storageKey,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          },
        },
      },
      select: { id: true },
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: enrollment.organizationId,
        userId: actor.actor.user.id,
        action: type === "PAYSLIP" ? "PAYSLIP_UPLOADED" : "PAYMENT_PROOF_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        metadata: { enrollmentId: enrollment.id, month },
      },
    });

    return document.id;
  };

  const payslipId = await uploadDocument(payslipFile, "PAYSLIP");
  if (payslipId) uploadedPayslipIds.push(payslipId);

  const proofId = await uploadDocument(proofFile, "PROOF_OF_PAYMENT");
  if (proofId) uploadedProofIds.push(proofId);

  const records = await loadOrganizationStipendRecords(enrollment.organizationId);
  const existingIndex = records.findIndex(
    (record) =>
      (recordIdRaw && record.id === recordIdRaw) ||
      (record.enrollmentId === enrollment.id && record.month === month),
  );
  const existing = existingIndex >= 0 ? records[existingIndex] : null;

  const nextRecord: StipendPaymentRecord = {
    id: existing?.id ?? `${enrollment.id}:${month}`,
    enrollmentId: enrollment.id,
    userId: enrollment.userId,
    month,
    eligible,
    stipendAmount,
    paymentStatus: paymentStatus as StipendPaymentRecord["paymentStatus"],
    exceptionReason: exceptionReasonRaw || null,
    payslipDocumentIds: [
      ...(existing?.payslipDocumentIds ?? []),
      ...uploadedPayslipIds,
    ],
    proofDocumentIds: [
      ...(existing?.proofDocumentIds ?? []),
      ...uploadedProofIds,
    ],
    updatedAt: new Date().toISOString(),
    updatedByUserId: actor.actor.user.id,
  };

  if (existingIndex >= 0) {
    records[existingIndex] = nextRecord;
  } else {
    records.push(nextRecord);
  }
  await saveOrganizationStipendRecords(enrollment.organizationId, records);

  await prisma.enrollment.update({
    where: { id: params.enrollmentId },
    data: {
      stipendPaid: paymentStatus === "PAID",
      stipendMonth: month || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: enrollment.organizationId,
      userId: actor.actor.user.id,
      action: "STIPEND_PAYMENT_UPDATED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        month,
        eligible,
        stipendAmount,
        paymentStatus,
        exceptionReason: exceptionReasonRaw || null,
        payslipUploads: uploadedPayslipIds.length,
        proofUploads: uploadedProofIds.length,
      },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
