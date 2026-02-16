import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function EnrollmentsPage({
  params,
  searchParams
}: {
  params: { orgSlug: string };
  searchParams?: { stipend?: string; month?: string; enrollment?: string; error?: string; count?: string };
}) {
  const access = await requireTenantAccess(params.orgSlug);
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: access.membership.organizationId },
    include: { user: true, program: true },
    orderBy: { id: "desc" },
    take: 100
  });

  const userIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.userId)));
  const learnerDocuments = await prisma.document.findMany({
    where: { userId: { in: userIds } },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 400
  });

  const pdfDocumentsByUser = learnerDocuments.reduce<Record<string, Array<{ id: string; type: string; createdAt: Date }>>>((acc, doc) => {
    const latestVersion = doc.versions[0];
    if (!latestVersion) return acc;

    const mimeType = latestVersion.mimeType.toLowerCase();
    const isPdf = mimeType.includes("pdf") || latestVersion.storageKey.toLowerCase().endsWith(".pdf");
    if (!isPdf) return acc;

    acc[doc.userId] ??= [];
    acc[doc.userId].push({ id: doc.id, type: doc.type, createdAt: doc.createdAt });
    return acc;
  }, {});

  const totalEnrollments = enrollments.length;
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "ACTIVE").length;
  const paidStipends = enrollments.filter((enrollment) => enrollment.stipendPaid).length;
  const unpaidStipends = totalEnrollments - paidStipends;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const stipendMessage =
    searchParams?.stipend === "updated"
      ? `Stipend updated${searchParams?.month ? ` for ${searchParams.month}` : ""}.`
      : searchParams?.stipend === "bulk-updated"
        ? `${searchParams?.count ?? "0"} enrollment${searchParams?.count === "1" ? "" : "s"} marked paid${searchParams?.month ? ` for ${searchParams.month}` : ""}.`
        : null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Enrollments</h1>
        <p className="text-sm text-slate-600">Track active learner placements and quickly process monthly stipend payments.</p>
      </div>

      {(searchParams?.error === "invalid-month" || searchParams?.error === "invalid-request") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {searchParams?.error === "invalid-request" ? (
            "Could not process stipend update request. Please refresh and try again."
          ) : (
            <>
              Please enter a valid stipend month in <span className="font-medium">YYYY-MM</span> format.
            </>
          )}
        </div>
      )}

      {stipendMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{stipendMessage}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalEnrollments}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{activeEnrollments}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Stipends paid</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{paidStipends}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Outstanding</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{unpaidStipends}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-900">Bulk monthly payout</p>
        <p className="mt-1 text-xs text-slate-600">Mark all active enrollments that are still unpaid for a selected month in one click.</p>
        <form action="/api/enrollments/stipend/bulk" method="post" className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="organizationId" value={access.membership.organizationId} />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Stipend month
            <input
              name="month"
              defaultValue={currentMonth}
              placeholder="YYYY-MM"
              pattern="\d{4}-\d{2}"
              className="h-9 min-w-[130px] rounded-md border border-slate-300 px-2 text-sm text-slate-700"
              required
            />
          </label>
          <button
            className="h-9 rounded-md border border-indigo-300 px-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={unpaidStipends === 0}
          >
            Mark active enrollments paid
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {enrollments.map((e) => (
          <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-slate-900">{e.user.email} · {e.program.name}</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{e.status}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${e.stipendPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                  {e.stipendPaid ? "Paid" : "Pending"}
                </span>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-600">
              Paid month: <span className="font-medium text-slate-700">{e.stipendMonth ?? "Not yet captured"}</span>
            </p>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-700">Learner PDFs (manual check)</p>
              {pdfDocumentsByUser[e.userId]?.length ? (
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {pdfDocumentsByUser[e.userId].slice(0, 3).map((doc) => (
                    <a
                      key={doc.id}
                      href={`/api/org/${params.orgSlug}/documents/${doc.id}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      View {doc.type} · {doc.createdAt.toISOString().slice(0, 10)}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">No PDF documents available for this learner.</p>
              )}
            </div>

            <form action={`/api/enrollments/${e.id}/stipend`} method="post" className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Stipend month
                <input
                  name="month"
                  defaultValue={e.stipendMonth ?? currentMonth}
                  placeholder="YYYY-MM"
                  pattern="\d{4}-\d{2}"
                  className="h-9 min-w-[130px] rounded-md border border-slate-300 px-2 text-sm text-slate-700"
                  required
                />
              </label>
              <button className="h-9 rounded-md border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50">
                {e.stipendPaid ? "Update stipend month" : "Mark stipend paid"}
              </button>
            </form>
          </div>
        ))}

        {enrollments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No enrollments found yet for this organization.
          </div>
        )}
      </div>
    </div>
  );
}
