import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function EnrollmentsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: access.membership.organizationId },
    include: { user: true, program: true },
    orderBy: { id: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Enrollments</h1>
      <div className="space-y-2">
        {enrollments.map((e) => (
          <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">
              {e.user.email} · {e.program.name}
            </p>
            <p className="text-slate-600">
              Programme status: {e.status} · Stipend paid: {String(e.stipendPaid)}
            </p>
            <p className="text-xs text-slate-500">
              Placement:{" "}
              {e.status === "PENDING"
                ? "Assigned (not started)"
                : e.status === "ACTIVE"
                  ? "Assigned and active"
                  : e.status === "COMPLETED"
                    ? "Completed"
                    : "Not assigned"}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {e.status === "PENDING" && (
                <form action={`/api/enrollments/${e.id}/status`} method="post">
                  <input type="hidden" name="status" value="ACTIVE" />
                  <button className="rounded border border-sky-300 px-2 py-1 text-xs text-sky-700">
                    Start programme
                  </button>
                </form>
              )}
              {e.status === "ACTIVE" && (
                <form action={`/api/enrollments/${e.id}/status`} method="post">
                  <input type="hidden" name="status" value="COMPLETED" />
                  <button className="rounded border border-indigo-300 px-2 py-1 text-xs text-indigo-700">
                    Mark completed
                  </button>
                </form>
              )}
            </div>

            <form action={`/api/enrollments/${e.id}/stipend`} method="post" className="mt-2 flex gap-2">
              <input
                name="month"
                placeholder="YYYY-MM"
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">
                Mark stipend paid
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

