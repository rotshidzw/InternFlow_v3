import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function templateRows(templateId: string) {
  const month = new Date().toISOString().slice(0, 7);

  const templates: Record<string, { fileName: string; rows: string[][] }> = {
    "induction-register": {
      fileName: "Induction_Register_Template.csv",
      rows: [
        ["programme", "cohort", "date", "learner_id", "learner_name", "signed_by_learner", "signed_by_facilitator", "approved_by_coordinator", "notes"],
        ["", "", "", "", "", "", "", "", ""],
      ],
    },
    "attendance-register": {
      fileName: "Daily_Attendance_Template.csv",
      rows: [
        ["date", "programme", "learner_id", "learner_name", "present", "reason_if_absent", "trainer_signoff", "coordinator_approval", "evidence_ref"],
        ["", "", "", "", "YES", "", "", "", ""],
      ],
    },
    "stipend-schedule": {
      fileName: "Stipend_Payment_Schedule_Template.csv",
      rows: [
        ["payment_month", "learner_id", "learner_name", "eligible", "stipend_amount", "payment_status", "exception_reason", "payslip_ref", "proof_of_payment_ref"],
        [month, "", "", "YES", "", "DUE", "", "", ""],
      ],
    },
    "document-checklist": {
      fileName: "Document_Checklist_Template.csv",
      rows: [
        ["learner_id", "learner_name", "document_type", "required", "status", "uploaded_at", "verified_by", "verified_at", "rejection_reason", "expiry_date"],
        ["", "", "ID", "YES", "missing", "", "", "", "", ""],
      ],
    },
    "cost-capture": {
      fileName: "Programme_Cost_Capture_Template.csv",
      rows: [
        ["reporting_month", "cost_category", "amount", "submitted_by", "status", "evidence_ref", "notes"],
        [month, "Facilitator Costs", "", "", "PENDING", "", ""],
        [month, "Transport", "", "", "PENDING", "", ""],
      ],
    },
    "follow-up-tracer": {
      fileName: "FollowUp_Tracer_Template.csv",
      rows: [
        ["learner_id", "learner_name", "programme", "3m_outcome", "6m_outcome", "12m_outcome", "outcome_evidence_ref", "follow_up_owner", "last_follow_up_date"],
        ["", "", "", "", "", "", "", "", ""],
      ],
    },
  };

  return templates[templateId] ?? null;
}

export async function GET(_: Request, { params }: { params: { orgSlug: string; templateId: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const template = templateRows(params.templateId);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const body = toCsv(template.rows);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${template.fileName}\"`,
    },
  });
}
