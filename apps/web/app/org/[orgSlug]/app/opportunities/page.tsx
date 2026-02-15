import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function OpportunitiesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const [programs, opportunities] = await Promise.all([
    prisma.program.findMany({ where: { organizationId: access.membership.organizationId } }),
    prisma.opportunity.findMany({ where: { organizationId: access.membership.organizationId }, orderBy: { title: "asc" }, include: { applications: true } })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Opportunities</h1>
      <form action={`/api/org/${params.orgSlug}/opportunities`} method="post" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-4">
        <input required name="title" placeholder="Opportunity title" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2" />
        <select name="type" className="rounded border border-slate-300 px-2 py-2 text-sm"><option>INTERNSHIP</option><option>LEARNERSHIP</option><option>SKILLS_PROGRAM</option><option>MENTORSHIP</option></select>
        <select name="programId" className="rounded border border-slate-300 px-2 py-2 text-sm"><option value="">No program</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <textarea required name="description" placeholder="Requirements and summary" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-3" />
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Publish opportunity</button>
      </form>
      <div className="space-y-2">
        {opportunities.map((o) => (
          <Link key={o.id} href={`/org/${params.orgSlug}/app/opportunities/${o.id}`} className="block rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-medium">{o.title}</p>
            <p className="text-sm text-slate-600">{o.type} · {o.status} · Applicants: {o.applications.length}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
