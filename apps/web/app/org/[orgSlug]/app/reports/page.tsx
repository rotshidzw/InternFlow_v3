import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function ReportsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const entries = await prisma.logbookEntry.findMany({
    where: { user: { memberships: { some: { organizationId: orgId } } } },
    include: {
      user: true,
      approvals: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "desc" },
    take: 120
  });

  const totalReports = entries.length;
  const reportsWithDocuments = entries.filter((entry) => Boolean(entry.evidenceKey)).length;
  const approvedReports = entries.filter((entry) => entry.approvals[0]?.status === "APPROVED").length;
  const pendingReports = entries.filter((entry) => !entry.approvals[0] || entry.approvals[0]?.status === "PENDING").length;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Student Reports</h1>
        <p className="text-sm text-slate-600">This section shows real report submissions from students and the evidence documents they uploaded.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Submitted reports</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalReports}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">With documents</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{reportsWithDocuments}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{approvedReports}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Pending review</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{pendingReports}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Exports</p>
        <p className="mt-1 text-xs text-slate-500">Download student report registers and report-document manifests only.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            href={`/api/org/${params.orgSlug}/exports/reports.csv`}
          >
            Download reports register CSV
          </Link>
          <Link
            className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            href={`/api/org/${params.orgSlug}/exports/report-documents.csv`}
          >
            Download report documents CSV
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const latestApproval = entry.approvals[0]?.status ?? "PENDING";
          return (
            <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">{entry.user.email} · Week {entry.weekStart.toISOString().slice(0, 10)}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    latestApproval === "APPROVED"
                      ? "bg-emerald-100 text-emerald-700"
                      : latestApproval === "REJECTED"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {latestApproval}
                </span>
              </div>

              <p className="mt-1 text-slate-700">{entry.summary}</p>

              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-700">Report document</p>
                {entry.evidenceKey ? (
                  <Link
                    href={`/api/org/${params.orgSlug}/logbooks/${entry.id}/evidence`}
                    target="_blank"
                    className="mt-1 inline-flex rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    View uploaded report document
                  </Link>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">No report document uploaded for this submission.</p>
                )}
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No student reports submitted yet.
          </div>
        )}
      </div>
    </div>
  );
}
