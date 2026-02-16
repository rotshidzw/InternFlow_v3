import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantApprovalsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;
  const now = new Date();

  const [verification, documentsNeedingReview] = await Promise.all([
    prisma.organizationVerification.findFirst({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.document.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { status: "SCAN_PENDING" },
          { status: "SCAN_FAILED" },
          { expirationDate: { lt: now } }
        ]
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 60
    })
  ]);

  const complianceStatus = verification?.status ?? "PENDING";
  const complianceReason = verification?.reason ?? "n/a";
  const scanPendingCount = documentsNeedingReview.filter((doc) => doc.status === "SCAN_PENDING").length;
  const scanFailedCount = documentsNeedingReview.filter((doc) => doc.status === "SCAN_FAILED").length;
  const expiredCount = documentsNeedingReview.filter((doc) => Boolean(doc.expirationDate && doc.expirationDate < now)).length;
  const totalAttentionCount = documentsNeedingReview.length;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Approvals &amp; Governance</h1>
        <p className="text-sm text-slate-600">Track organization compliance decisions and document reviews that need coordinator action.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Compliance status</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{complianceStatus}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Docs needing action</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{totalAttentionCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Scan pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{scanPendingCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Scan failed</p>
          <p className="mt-1 text-2xl font-semibold text-rose-800">{scanFailedCount}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Expired docs</p>
          <p className="mt-1 text-2xl font-semibold text-orange-800">{expiredCount}</p>
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

        <p className="mt-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Reason:</span> {complianceReason}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Document reviews requiring attention</p>
            <p className="mt-1 text-xs text-slate-500">Items with scan issues or expired validity that should be reviewed in the Document Vault.</p>
          </div>
          <Link
            href={`/org/${params.orgSlug}/app/documents`}
            className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Open Document Vault
          </Link>
        </div>

        {documentsNeedingReview.length > 0 ? (
          <div className="mt-3 space-y-2">
            {documentsNeedingReview.map((doc) => {
              const isExpired = Boolean(doc.expirationDate && doc.expirationDate < now);
              const reviewState = doc.status === "SCAN_FAILED" ? "SCAN_FAILED" : doc.status === "SCAN_PENDING" ? "SCAN_PENDING" : isExpired ? "EXPIRED" : doc.status;

              return (
                <div key={doc.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-900">{doc.user.email} · {doc.type}</p>
                  <p className="mt-0.5 text-xs text-slate-600">State: {reviewState}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Uploaded: {doc.createdAt.toISOString().slice(0, 10)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
            No document approvals are pending right now.
          </div>
        )}
      </div>
    </div>
  );
}
