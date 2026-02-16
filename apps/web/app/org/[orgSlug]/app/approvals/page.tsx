import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantApprovalsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const [verification, pendingLogbookApprovals] = await Promise.all([
    prisma.organizationVerification.findFirst({
      where: { orgId: access.membership.organizationId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.logbookApproval.findMany({
      where: {
        status: "PENDING",
        entry: {
          user: {
            memberships: {
              some: { organizationId: access.membership.organizationId }
            }
          }
        }
      },
      include: { entry: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  const complianceStatus = verification?.status ?? "PENDING";
  const complianceReason = verification?.reason ?? "n/a";
  const pendingCount = pendingLogbookApprovals.length;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Approvals &amp; Governance</h1>
        <p className="text-sm text-slate-600">Track compliance outcomes and quickly process pending learner review decisions.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Compliance status</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{complianceStatus}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Pending approvals</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Latest compliance reason</p>
          <p className="mt-1 text-sm font-medium text-emerald-900">{complianceReason}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Organization compliance status (HQ decision)</p>
            <p className="mt-1 text-xs text-slate-500">Latest decision recorded for this tenant organization.</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              complianceStatus === "APPROVED"
                ? "bg-emerald-100 text-emerald-700"
                : complianceStatus === "REJECTED"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {complianceStatus}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Pending supervisor/coordinator approvals</p>
            <p className="mt-1 text-xs text-slate-500">Reviews waiting for decision. Open Logbooks to approve/reject each entry.</p>
          </div>
          <Link
            href={`/org/${params.orgSlug}/app/logbooks?filter=PENDING`}
            className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Open pending logbooks
          </Link>
        </div>

        {pendingCount > 0 ? (
          <div className="mt-3 space-y-2">
            {pendingLogbookApprovals.map((approval) => (
              <div key={approval.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">
                  {approval.entry.user.email} · Week {approval.entry.weekStart.toISOString().slice(0, 10)}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">Summary: {approval.entry.summary}</p>
                <p className="mt-0.5 text-xs text-slate-500">Requested: {approval.createdAt.toISOString().slice(0, 10)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
            No pending approvals right now. Great job keeping reviews up to date.
          </div>
        )}
      </div>
    </div>
  );
}
