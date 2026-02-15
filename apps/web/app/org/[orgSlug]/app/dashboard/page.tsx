import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export default async function TenantDashboardPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const [
    programs,
    opportunities,
    applications,
    enrollments,
    docs,
    approvalsPending,
    recentApps,
    recentLogs,
    recentAudits
  ] = await Promise.all([
    prisma.program.count({ where: { organizationId: orgId } }),
    prisma.opportunity.count({ where: { organizationId: orgId } }),
    prisma.application.findMany({ where: { opportunity: { organizationId: orgId } }, select: { status: true, createdAt: true } }),
    prisma.enrollment.findMany({ where: { organizationId: orgId }, select: { status: true, stipendPaid: true } }),
    prisma.document.findMany({ where: { organizationId: orgId }, select: { status: true, expirationDate: true } }),
    prisma.logbookApproval.count({ where: { status: "PENDING", entry: { user: { memberships: { some: { organizationId: orgId } } } } } }),
    prisma.application.findMany({ where: { opportunity: { organizationId: orgId } }, include: { user: true, opportunity: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.logbookEntry.findMany({ where: { user: { memberships: { some: { organizationId: orgId } } } }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.auditLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 8, include: { actor: true } })
  ]);

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE").length;
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED").length;
  const paidStipends = enrollments.filter((e) => e.stipendPaid).length;

  const appByStatus = {
    APPLIED: applications.filter((a) => a.status === "APPLIED").length,
    SHORTLISTED: applications.filter((a) => a.status === "SHORTLISTED").length,
    ACCEPTED: applications.filter((a) => a.status === "ACCEPTED").length,
    REJECTED: applications.filter((a) => a.status === "REJECTED").length
  };

  const needsAttentionDocs = docs.filter((d) => ["SCAN_FAILED", "SCAN_PENDING"].includes(d.status) || (d.expirationDate && d.expirationDate < new Date())).length;
  const validDocs = docs.length - needsAttentionDocs;
  const compliancePct = pct(validDocs, docs.length);

  const last14 = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const appTrend = last14.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const count = applications.filter((a) => a.createdAt.toISOString().slice(0, 10) === key).length;
    return { label: d.toISOString().slice(5, 10), count };
  });
  const maxTrend = Math.max(1, ...appTrend.map((x) => x.count));

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">Tenant Home</h1>
        <p className="text-sm text-slate-600">Manage recruitment, compliance, learner progression, and stipend delivery from one command center.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href={`/org/${params.orgSlug}/app/programs`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"><p className="text-xs text-slate-500">Programs</p><p className="mt-2 text-3xl font-semibold">{programs}</p></Link>
        <Link href={`/org/${params.orgSlug}/app/opportunities`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"><p className="text-xs text-slate-500">Opportunities</p><p className="mt-2 text-3xl font-semibold">{opportunities}</p></Link>
        <Link href={`/org/${params.orgSlug}/app/enrollments`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"><p className="text-xs text-slate-500">Active learners</p><p className="mt-2 text-3xl font-semibold">{activeEnrollments}</p></Link>
        <Link href={`/org/${params.orgSlug}/app/approvals`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"><p className="text-xs text-slate-500">Pending approvals</p><p className="mt-2 text-3xl font-semibold">{approvalsPending}</p></Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Applications trend (14 days)</h2>
            <Link href={`/org/${params.orgSlug}/app/applicants`} className="text-xs text-blue-600">Open pipeline →</Link>
          </div>
          <div className="grid grid-cols-14 gap-1">
            {appTrend.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-1">
                <div className="h-24 w-full rounded bg-slate-100">
                  <div className="w-full rounded bg-blue-500" style={{ height: `${Math.max(6, (d.count / maxTrend) * 100)}%`, marginTop: `${100 - Math.max(6, (d.count / maxTrend) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-slate-500">{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="font-semibold">Compliance pulse</h2>
          <p className="mt-2 text-4xl font-semibold">{compliancePct}%</p>
          <p className="text-xs text-slate-500">valid docs</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${compliancePct}%` }} /></div>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>Valid docs: {validDocs}</p>
            <p>Needs review: {needsAttentionDocs}</p>
            <p>Completed enrollments: {completedEnrollments}</p>
            <p>Stipends paid: {paidStipends}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="font-semibold">Recruitment pipeline</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(appByStatus).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><span>{k}</span><span className="font-semibold">{v}</span></div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Latest applicants</h2><Link href={`/org/${params.orgSlug}/app/applicants`} className="text-xs text-blue-600">View all</Link></div>
          <div className="space-y-2 text-sm">
            {recentApps.map((a) => <div key={a.id} className="rounded-lg border border-slate-200 px-3 py-2"><p className="font-medium">{a.user.email}</p><p className="text-slate-500">{a.opportunity.title} · {a.status}</p></div>)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Recent learner activity</h2><Link href={`/org/${params.orgSlug}/app/logbooks`} className="text-xs text-blue-600">Logbooks</Link></div>
          <div className="space-y-2 text-sm">
            {recentLogs.map((l) => <div key={l.id} className="rounded-lg border border-slate-200 px-3 py-2"><p className="font-medium">{l.user.email}</p><p className="text-slate-500">{l.weekStart.toISOString().slice(0,10)} · {l.summary.slice(0, 54)}...</p></div>)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent system events</h2>
          <Link href={`/org/${params.orgSlug}/app/reports`} className="text-xs text-blue-600">Reports & exports</Link>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {recentAudits.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <p className="font-medium">{a.action.replaceAll("_", " ")}</p>
              <p className="text-slate-500">{a.actor?.email ?? "system"} · {a.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
