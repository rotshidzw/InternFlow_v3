import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function LearnerPage({ params }: { params: { orgSlug: string; learnerId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const user = await prisma.user.findUnique({ where: { id: params.learnerId } });
  if (!user) return <div>Learner not found.</div>;

  const [applications, enrollments, docs, logs] = await Promise.all([
    prisma.application.findMany({ where: { userId: user.id, opportunity: { organizationId: access.membership.organizationId } }, include: { opportunity: true } }),
    prisma.enrollment.findMany({ where: { userId: user.id, organizationId: access.membership.organizationId }, include: { program: true } }),
    prisma.document.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.logbookEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12, include: { approvals: true } })
  ]);

  const missingDocs = docs.filter((d) => ["SCAN_FAILED", "REJECTED"].includes(d.status)).length;
  const compliance = docs.length ? Math.max(5, Math.round(((docs.length - missingDocs) / docs.length) * 100)) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Learner lifecycle: {user.email}</h1>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Compliance</p><p className="text-2xl font-semibold">{compliance}%</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Applications</p><p className="text-2xl font-semibold">{applications.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Enrollments</p><p className="text-2xl font-semibold">{enrollments.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Missing docs</p><p className="text-2xl font-semibold">{missingDocs}</p></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><p className="font-medium">Logbook status</p>{logs.map((l) => <p key={l.id}>Week {l.weekStart.toISOString().slice(0,10)} · approvals {l.approvals.length}</p>)}</div>
    </div>
  );
}
