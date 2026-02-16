import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function ProgramsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const programs = await prisma.program.findMany({ where: { organizationId: access.membership.organizationId }, orderBy: { name: "asc" }, include: { _count: { select: { opportunities: true, enrollments: true } } } as any });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Programs</h1>
      <form action={`/api/org/${params.orgSlug}/programs`} method="post" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-5">
        <input required name="name" placeholder="Program name" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2" />
        <input name="setaCetaName" placeholder="SETA/CETA" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        <input name="startDate" type="date" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        <input name="endDate" type="date" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        <textarea name="description" placeholder="Description" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-4" />
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Create Program</button>
      </form>
      <div className="space-y-2">
        {programs.map((p: any) => (
          <Link key={p.id} href={`/org/${params.orgSlug}/app/programs/${p.id}`} className="block rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-slate-600">{p.description}</p>
            <p className="text-xs text-slate-500">Opportunities: {p._count.opportunities} · Enrollments: {p._count.enrollments}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
