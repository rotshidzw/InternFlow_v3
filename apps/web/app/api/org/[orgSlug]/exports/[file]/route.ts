import { prisma } from "@internflow/db/src";
import {
  loadOrganizationCostCaptureRecords,
  loadOrganizationStipendRecords,
  parseAttendanceRegisterMetadata,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

function csv(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET(_: Request, { params }: { params: { orgSlug: string; file: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const orgId = actor.actor.membership.organizationId;
  let rows: string[][];
  let rowCount = 0;

  if (params.file === "stipend.csv") {
    const stipendRecords = await loadOrganizationStipendRecords(orgId);
    const enrollments = await prisma.enrollment.findMany({
      where: { organizationId: orgId },
      include: { user: true, cohort: true, program: true },
    });
    const rowsData: string[][] = [];
    for (const enrollment of enrollments) {
      const records = stipendRecords.filter(
        (record) => record.enrollmentId === enrollment.id,
      );
      if (records.length === 0) {
        rowsData.push([
          enrollment.userId,
          enrollment.user.email,
          enrollment.program.name,
          enrollment.cohort?.name ?? "",
          enrollment.status,
          enrollment.stipendMonth ?? "",
          enrollment.status === "ACTIVE" ? "YES" : "NO",
          enrollment.stipendPaid ? "PAID" : "DUE",
          "",
          "",
          "0",
          "0",
          "",
        ]);
        continue;
      }

      for (const record of records) {
        rowsData.push([
          enrollment.userId,
          enrollment.user.email,
          enrollment.program.name,
          enrollment.cohort?.name ?? "",
          enrollment.status,
          record.month,
          record.eligible ? "YES" : "NO",
          record.paymentStatus,
          record.stipendAmount === null ? "" : String(record.stipendAmount),
          record.exceptionReason ?? "",
          String(record.payslipDocumentIds.length),
          String(record.proofDocumentIds.length),
          record.updatedAt,
        ]);
      }
    }

    rowCount = rowsData.length;
    rows = [
      [
        "learnerId",
        "email",
        "programme",
        "cohort",
        "enrollmentStatus",
        "paymentMonth",
        "eligible",
        "paymentStatus",
        "stipendAmount",
        "exceptionReason",
        "payslipCount",
        "proofOfPaymentCount",
        "updatedAt",
      ],
      ...rowsData,
    ];
  } else if (params.file === "registers.csv") {
    const registers = await prisma.organizationDocument.findMany({
      where: { orgId, category: "ATTENDANCE_REGISTER" },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    rowCount = registers.length;
    rows = [
      [
        "registerId",
        "fileName",
        "uploadedAt",
        "reviewStatus",
        "registerType",
        "programmeId",
        "month",
        "attendanceDate",
        "learnerUserId",
        "trainerSignoffBy",
        "trainerSignoffAt",
        "coordinatorDecision",
        "coordinatorApprovalBy",
        "coordinatorApprovalAt",
      ],
      ...registers.map((register) => {
        const metadata = parseAttendanceRegisterMetadata(register.notes);
        return [
          register.id,
          register.fileKey.split("/").pop() ?? register.fileKey,
          register.createdAt.toISOString(),
          register.status,
          metadata?.registerType ?? "",
          metadata?.programmeId ?? "",
          metadata?.month ?? "",
          metadata?.attendanceDate ?? "",
          metadata?.learnerUserId ?? "",
          metadata?.trainerSignoffBy ?? "",
          metadata?.trainerSignoffAt ?? "",
          metadata?.coordinatorApprovalDecision ?? "",
          metadata?.coordinatorApprovalBy ?? "",
          metadata?.coordinatorApprovalAt ?? "",
        ];
      }),
    ];
  } else if (params.file === "costs.csv") {
    const programmes = await prisma.program.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    const programmeById = new Map(programmes.map((programme) => [programme.id, programme.name]));
    const costs = await loadOrganizationCostCaptureRecords(orgId);
    rowCount = costs.length;
    rows = [
      [
        "recordId",
        "month",
        "programmeId",
        "programme",
        "category",
        "amount",
        "status",
        "evidenceCount",
        "notes",
        "updatedAt",
        "updatedByUserId",
      ],
      ...costs.map((record) => [
        record.id,
        record.month,
        record.programmeId ?? "",
        record.programmeId ? (programmeById.get(record.programmeId) ?? "") : "",
        record.category,
        String(record.amount),
        record.status,
        String(record.evidenceDocumentIds.length),
        record.notes ?? "",
        record.updatedAt,
        record.updatedByUserId,
      ]),
    ];
  } else if (params.file === "compliance.csv") {
    const docs = await prisma.document.findMany({
      where: { organizationId: orgId },
      include: { user: true },
    });
    rowCount = docs.length;
    rows = [
      ["email", "type", "status", "createdAt"],
      ...docs.map((d) => [d.user.email, d.type, d.status, d.createdAt.toISOString()]),
    ];
  } else if (params.file === "learners.csv") {
    const learners = await prisma.membership.findMany({
      where: { organizationId: orgId, role: "STUDENT" },
      include: { user: true },
    });
    rowCount = learners.length;
    rows = [["email", "name"], ...learners.map((l) => [l.user.email, l.user.name ?? ""])];
  } else {
    return new Response("Not found", { status: 404 });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: orgId,
      userId: actor.actor.user.id,
      action: "EXPORT_CSV_DOWNLOADED",
      entityType: "Organization",
      entityId: orgId,
      metadata: { file: params.file, rowCount },
    },
  });

  const body = csv(rows);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${params.file}\"`,
    },
  });
}
