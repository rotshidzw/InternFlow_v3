import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function ProgramDetailPage({ params }: { params: { orgSlug: string; programId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const program = await prisma.program.findFirst({ where: { id: params.programId, organizationId: access.membership.organizationId }, include: { opportunities: true, enrollments: { include: { user: true } } } });
  if (!program) return <div>Program not found.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{program.name}</h1>
      <p className="text-sm text-slate-600">{program.description}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <h2 className="font-medium">Opportunities</h2>
          {program.opportunities.map((o) => <p key={o.id} className="mt-1 text-sm">{o.title} · {o.status}</p>)}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <h2 className="font-medium">Enrollments</h2>
          {program.enrollments.map((e) => <p key={e.id} className="mt-1 text-sm">{e.user.email} · {e.status}</p>)}
        </div>
      </div>
    </div>
  );
}
