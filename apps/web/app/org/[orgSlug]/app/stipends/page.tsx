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
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Stipend & Payment Operations</h1>
        <p className="text-sm text-slate-600">
          Track monthly eligibility, payment state, exceptions, and payslip/proof evidence.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Paid: <span className="font-semibold">{paidCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Due: <span className="font-semibold">{dueCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          On hold: <span className="font-semibold">{holdCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Exceptions: <span className="font-semibold">{exceptionCount}</span>
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
              <div key={enrollment.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium">
                  {(enrollment.user.name ?? enrollment.user.email) + " | " + enrollment.program.name}
                </p>
                <p className="text-slate-600">
                  Enrollment: {enrollment.status} | Last payment status:{" "}
                  {latest?.paymentStatus ?? (enrollment.stipendPaid ? "PAID" : "DUE")} | Month:{" "}
                  {latest?.month ?? enrollment.stipendMonth ?? "n/a"}
                </p>
                <form
                  action={`/api/enrollments/${enrollment.id}/stipend`}
                  method="post"
                  encType="multipart/form-data"
                  className="mt-2 grid gap-2 md:grid-cols-3"
                >
                  <input type="hidden" name="recordId" value={latest?.id ?? ""} />
                  <input
                    name="month"
                    defaultValue={latest?.month ?? thisMonth()}
                    placeholder="YYYY-MM"
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <select
                    name="eligible"
                    defaultValue={String(latest?.eligible ?? (enrollment.status === "ACTIVE"))}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="true">Eligible</option>
                    <option value="false">Not eligible</option>
                  </select>
                  <select
                    name="paymentStatus"
                    defaultValue={latest?.paymentStatus ?? (enrollment.stipendPaid ? "PAID" : "DUE")}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
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
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <input
                    name="exceptionReason"
                    defaultValue={latest?.exceptionReason ?? ""}
                    placeholder="Exception reason (if any)"
                    className="rounded border border-slate-300 px-2 py-1 text-xs md:col-span-2"
                  />
                  <input
                    name="payslipFile"
                    type="file"
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <input
                    name="proofFile"
                    type="file"
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">
                    Save payment record
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Your role can inspect stipend records but cannot update payment state.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Recorded stipend periods</h2>
        <div className="mt-3 space-y-2 text-sm">
          {stipendRecords.length === 0 ? (
            <p className="text-slate-500">No stipend payment records captured yet.</p>
          ) : (
            stipendRecords.map((record) => {
              const enrollment = enrollmentById.get(record.enrollmentId);
              const learnerLabel = enrollment
                ? enrollment.user.name ?? enrollment.user.email
                : record.userId;
              return (
                <div key={record.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {learnerLabel} | {record.month}
                  </p>
                  <p className="text-slate-600">
                    Status: {record.paymentStatus} | Eligible: {record.eligible ? "YES" : "NO"} | Amount:{" "}
                    {record.stipendAmount ?? 0}
                  </p>
                  <p className="text-slate-600">
                    Exception: {record.exceptionReason ?? "None"} | Payslips:{" "}
                    {record.payslipDocumentIds.length} | Proofs: {record.proofDocumentIds.length}
                  </p>
                  {canReadEvidence && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {record.payslipDocumentIds.map((documentId, index) => (
                        <a
                          key={documentId}
                          href={`/api/org/${params.orgSlug}/documents/${documentId}/download`}
                          className="rounded border border-slate-300 px-2 py-1 text-slate-700"
                        >
                          Payslip {index + 1}
                        </a>
                      ))}
                      {record.proofDocumentIds.map((documentId, index) => (
                        <a
                          key={documentId}
                          href={`/api/org/${params.orgSlug}/documents/${documentId}/download`}
                          className="rounded border border-slate-300 px-2 py-1 text-slate-700"
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
