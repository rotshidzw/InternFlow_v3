import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function LogbooksPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const memberIds = await prisma.membership.findMany({ where: { organizationId: access.membership.organizationId }, select: { userId: true } });
  const logs = await prisma.logbookEntry.findMany({ where: { userId: { in: memberIds.map((m) => m.userId) } }, include: { user: true, approvals: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 80 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Logbooks</h1>
      <div className="space-y-2">
        {logs.map((l) => (
          <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">{l.user.email} · Week {l.weekStart.toISOString().slice(0,10)}</p>
            <p>{l.summary}</p>
            <p className="text-slate-600">Latest approval: {l.approvals[0]?.status ?? "PENDING"}</p>
            <form action={`/api/org/${params.orgSlug}/logbooks/${l.id}/approval`} method="post" className="mt-2 flex gap-2">
              <select name="status" className="rounded border border-slate-300 px-2 py-1 text-xs"><option>APPROVED</option><option>REJECTED</option></select>
              <input name="comment" placeholder="Comment" className="rounded border border-slate-300 px-2 py-1 text-xs" />
              <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white">Submit review</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
