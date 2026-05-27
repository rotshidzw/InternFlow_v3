import { prisma } from "@internflow/db/src";
import {
  loadOrganizationStipendRecords,
  STIPEND_PAYMENT_STATUSES,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";
import { requireTenantAccess } from "@/lib/tenant-portal";

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function StipendsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const canManage = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.STIPEND_MANAGE,
  );
  const canReadEvidence = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.EXPORT_READ,
  );

  const [enrollments, stipendRecords] = await Promise.all([
    prisma.enrollment.findMany({
      where: { organizationId: access.membership.organizationId },
      include: { user: true, program: true },
      orderBy: { id: "desc" },
      take: 300,
    }),
    loadOrganizationStipendRecords(access.membership.organizationId),
  ]);

  const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));
  const recordsByEnrollment = new Map<string, typeof stipendRecords>();
  for (const record of stipendRecords) {
    const current = recordsByEnrollment.get(record.enrollmentId) ?? [];
    current.push(record);
    recordsByEnrollment.set(record.enrollmentId, current);
  }

  const paidCount = stipendRecords.filter((record) => record.paymentStatus === "PAID").length;
  const dueCount = stipendRecords.filter((record) => record.paymentStatus === "DUE").length;
  const holdCount = stipendRecords.filter((record) => record.paymentStatus === "HOLD").length;
  const exceptionCount = stipendRecords.filter((record) => Boolean(record.exceptionReason)).length;

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Finance Operations</p>
        <h1 className="if-auth-title mt-2">Stipend and payment operations</h1>
        <p className="if-auth-subtitle">
          Track monthly eligibility, payment state, exceptions, and payslip/proof evidence with clear audit context.
        </p>
      </section>

      <div className="if-auth-metrics sm:grid-cols-4">
        <div className="if-auth-metric">
          <p className="if-auth-metric-label">Paid</p>
          <p className="if-auth-metric-value">{paidCount}</p>
        </div>
        <div className="if-auth-metric">
          <p className="if-auth-metric-label">Due</p>
          <p className="if-auth-metric-value">{dueCount}</p>
        </div>
        <div className="if-auth-metric">
          <p className="if-auth-metric-label">On hold</p>
          <p className="if-auth-metric-value">{holdCount}</p>
        </div>
        <div className="if-auth-metric">
          <p className="if-auth-metric-label">Exceptions</p>
          <p className="if-auth-metric-value">{exceptionCount}</p>
        </div>
      </div>

      {canManage ? (
        <div className="space-y-3">
          {enrollments.map((enrollment) => {
            const history = (recordsByEnrollment.get(enrollment.id) ?? []).sort((a, b) =>
              b.month.localeCompare(a.month),
            );
            const latest = history[0];
            return (
              <div key={enrollment.id} className="if-panel rounded-xl p-3 text-sm">
                <p className="font-medium text-brand-text">
                  {(enrollment.user.name ?? enrollment.user.email) + " | " + enrollment.program.name}
                </p>
                <p className="text-brand-textSoft">
                  Enrollment: {enrollment.status} | Last payment status:{" "}
                  {latest?.paymentStatus ?? (enrollment.stipendPaid ? "PAID" : "DUE")} | Month:{" "}
                  {latest?.month ?? enrollment.stipendMonth ?? "n/a"}
                </p>
                <form
                  action={`/api/enrollments/${enrollment.id}/stipend`}
                  method="post"
                  encType="multipart/form-data"
                  className="if-filter-grid mt-2 md:grid-cols-3"
                >
                  <input type="hidden" name="recordId" value={latest?.id ?? ""} />
                  <input
                    name="month"
                    defaultValue={latest?.month ?? thisMonth()}
                    placeholder="YYYY-MM"
                    className="rounded px-2 py-1 text-xs"
                  />
                  <select
                    name="eligible"
                    defaultValue={String(latest?.eligible ?? (enrollment.status === "ACTIVE"))}
                    className="rounded px-2 py-1 text-xs"
                  >
                    <option value="true">Eligible</option>
                    <option value="false">Not eligible</option>
                  </select>
                  <select
                    name="paymentStatus"
                    defaultValue={latest?.paymentStatus ?? (enrollment.stipendPaid ? "PAID" : "DUE")}
                    className="rounded px-2 py-1 text-xs"
                  >
                    {STIPEND_PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input
                    name="stipendAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={latest?.stipendAmount ?? ""}
                    placeholder="Amount"
                    className="rounded px-2 py-1 text-xs"
                  />
                  <input
                    name="exceptionReason"
                    defaultValue={latest?.exceptionReason ?? ""}
                    placeholder="Exception reason (if any)"
                    className="rounded px-2 py-1 text-xs md:col-span-2"
                  />
                  <input
                    name="payslipFile"
                    type="file"
                    className="rounded px-2 py-1 text-xs"
                  />
                  <input
                    name="proofFile"
                    type="file"
                    className="rounded px-2 py-1 text-xs"
                  />
                  <button className="if-btn if-btn-primary px-2 py-1 text-xs">
                    Save payment record
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="if-status if-status-warning">
          Your role can inspect stipend records but cannot update payment state.
        </p>
      )}

      <div className="if-panel rounded-2xl p-4">
        <h2 className="font-semibold text-brand-text">Recorded stipend periods</h2>
        <div className="mt-3 space-y-2 text-sm">
          {stipendRecords.length === 0 ? (
            <p className="text-brand-muted">No stipend payment records captured yet.</p>
          ) : (
            stipendRecords.map((record) => {
              const enrollment = enrollmentById.get(record.enrollmentId);
              const learnerLabel = enrollment
                ? enrollment.user.name ?? enrollment.user.email
                : record.userId;
              return (
                <div key={record.id} className="if-panel-muted rounded-lg border border-brand-border/60 p-3">
                  <p className="font-medium text-brand-text">
                    {learnerLabel} | {record.month}
                  </p>
                  <p className="text-brand-textSoft">
                    Status: {record.paymentStatus} | Eligible: {record.eligible ? "YES" : "NO"} | Amount:{" "}
                    {record.stipendAmount ?? 0}
                  </p>
                  <p className="text-brand-textSoft">
                    Exception: {record.exceptionReason ?? "None"} | Payslips:{" "}
                    {record.payslipDocumentIds.length} | Proofs: {record.proofDocumentIds.length}
                  </p>
                  {canReadEvidence && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {record.payslipDocumentIds.map((documentId, index) => (
                        <a
                          key={documentId}
                          href={`/api/org/${params.orgSlug}/documents/${documentId}/download`}
                          className="if-btn if-btn-secondary px-2 py-1 text-xs"
                        >
                          Payslip {index + 1}
                        </a>
                      ))}
                      {record.proofDocumentIds.map((documentId, index) => (
                        <a
                          key={documentId}
                          href={`/api/org/${params.orgSlug}/documents/${documentId}/download`}
                          className="if-btn if-btn-secondary px-2 py-1 text-xs"
                        >
                          Proof {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
