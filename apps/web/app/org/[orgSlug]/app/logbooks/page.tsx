import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

type LogbooksPageSearchParams = {
  reviewed?: string;
  filter?: string;
  q?: string;
};

const REVIEW_FILTERS = new Set(["ALL", "PENDING", "APPROVED", "REJECTED"]);

export default async function LogbooksPage({
  params,
  searchParams
}: {
  params: { orgSlug: string };
  searchParams?: LogbooksPageSearchParams;
}) {
  const access = await requireTenantAccess(params.orgSlug);
  const memberIds = await prisma.membership.findMany({
    where: { organizationId: access.membership.organizationId },
    select: { userId: true }
  });

  const logs = await prisma.logbookEntry.findMany({
    where: { userId: { in: memberIds.map((m) => m.userId) } },
    include: {
      user: true,
      approvals: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" },
    take: 120
  });

  const selectedFilter = (searchParams?.filter ?? "ALL").toUpperCase();
  const activeFilter = REVIEW_FILTERS.has(selectedFilter) ? selectedFilter : "ALL";
  const query = searchParams?.q?.trim().toLowerCase() ?? "";

  const rows = logs.map((log) => {
    const latestApproval = log.approvals[0]?.status ?? "PENDING";
    return { ...log, latestApproval };
  });

  const totalLogbooks = rows.length;
  const pendingCount = rows.filter((row) => row.latestApproval === "PENDING").length;
  const approvedCount = rows.filter((row) => row.latestApproval === "APPROVED").length;
  const rejectedCount = rows.filter((row) => row.latestApproval === "REJECTED").length;

  const filteredRows = rows.filter((row) => {
    if (activeFilter !== "ALL" && row.latestApproval !== activeFilter) return false;
    if (!query) return true;

    const week = row.weekStart.toISOString().slice(0, 10);
    const text = `${row.user.email} ${row.summary} ${week}`.toLowerCase();
    return text.includes(query);
  });

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Logbooks</h1>
        <p className="text-sm text-slate-600">Review weekly learner updates, approve quickly, and track pending items at a glance.</p>
      </div>

      {searchParams?.reviewed === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Review submitted successfully.</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total logbooks</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalLogbooks}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-rose-800">{rejectedCount}</p>
        </div>
      </div>

      <form method="get" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-900">Filter logbooks</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Review status
            <select name="filter" defaultValue={activeFilter} className="h-9 min-w-[150px] rounded-md border border-slate-300 px-2 text-sm text-slate-700">
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Search learner/week/summary
            <input
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="e.g. applicant20 or 2026-02"
              className="h-9 min-w-[260px] rounded-md border border-slate-300 px-2 text-sm text-slate-700"
            />
          </label>

          <button className="h-9 rounded-md border border-indigo-300 px-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50">Apply filters</button>
        </div>
      </form>

      <div className="space-y-3">
        {filteredRows.map((l) => (
          <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-slate-900">{l.user.email} · Week {l.weekStart.toISOString().slice(0, 10)}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  l.latestApproval === "APPROVED"
                    ? "bg-emerald-100 text-emerald-700"
                    : l.latestApproval === "REJECTED"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {l.latestApproval}
              </span>
            </div>

            <p className="mt-1 text-slate-700">{l.summary}</p>
            <p className="mt-1 text-xs text-slate-500">Submitted: {l.createdAt.toISOString().slice(0, 10)}</p>

            <form action={`/api/org/${params.orgSlug}/logbooks/${l.id}/approval`} method="post" className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Decision
                <select name="status" defaultValue={l.latestApproval === "PENDING" ? "APPROVED" : l.latestApproval} className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-700">
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Reviewer comment
                <input
                  name="comment"
                  placeholder={l.latestApproval === "REJECTED" ? "What must be fixed?" : "Optional comment"}
                  className="h-9 min-w-[260px] rounded-md border border-slate-300 px-2 text-sm text-slate-700"
                />
              </label>

              <button className="h-9 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800">
                Submit review
              </button>
            </form>
          </div>
        ))}

        {filteredRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No logbooks matched your current filters.
          </div>
        )}
      </div>
    </div>
  );
}
