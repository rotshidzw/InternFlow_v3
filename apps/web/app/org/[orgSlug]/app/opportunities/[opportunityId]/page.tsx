import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function OpportunityDetailPage({ params }: { params: { orgSlug: string; opportunityId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const opportunity = await prisma.opportunity.findFirst({ where: { id: params.opportunityId, organizationId: access.membership.organizationId }, include: { applications: { include: { user: true }, orderBy: { createdAt: "desc" } } } });
  if (!opportunity) return <div>Opportunity not found.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{opportunity.title}</h1>
      <p className="text-sm text-slate-600">{opportunity.description}</p>
      <div className="space-y-2">
        {opportunity.applications.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">{a.user.email}</p>
            <p>Status: {a.status}</p>
            <form action={`/api/applications/${a.id}/status`} method="post" className="mt-2 flex gap-2">
              <select name="status" className="rounded border border-slate-300 px-2 py-1 text-xs"><option>SHORTLISTED</option><option>ACCEPTED</option><option>REJECTED</option></select>
              <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white">Update</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
