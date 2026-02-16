import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function EnrollmentsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const enrollments = await prisma.enrollment.findMany({ where: { organizationId: access.membership.organizationId }, include: { user: true, program: true }, orderBy: { id: "desc" }, take: 100 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Enrollments</h1>
      <div className="space-y-2">
        {enrollments.map((e) => (
          <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">{e.user.email} · {e.program.name}</p>
            <p className="text-slate-600">Status: {e.status} · Stipend paid: {String(e.stipendPaid)}</p>
            <form action={`/api/enrollments/${e.id}/stipend`} method="post" className="mt-2 flex gap-2">
              <input name="month" placeholder="YYYY-MM" className="rounded border border-slate-300 px-2 py-1 text-xs" />
              <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Mark stipend paid</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
