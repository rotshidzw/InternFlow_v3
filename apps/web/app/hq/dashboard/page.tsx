import { prisma } from "@internflow/db/src";

export default async function HQDashboardPage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [tenantCount, pendingApprovals, openTickets, meetingsToday, users7d, docs7d, metrics, recent] = await Promise.all([
    prisma.organization.count(),
    prisma.organizationVerification.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.meeting.count({ where: { startAt: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) } } }),
    prisma.usageMetricsDaily.aggregate({ _sum: { activeUsers: true }, where: { date: { gte: since } } }),
    prisma.usageMetricsDaily.aggregate({ _sum: { docsUploaded: true }, where: { date: { gte: since } } }),
    prisma.usageMetricsDaily.findMany({ orderBy: { date: "asc" }, take: 14 }),
    prisma.auditLog.findMany({ where: { scope: "PLATFORM" }, orderBy: { createdAt: "desc" }, take: 12 })
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">HQ Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[['Total tenants', tenantCount], ['Pending approvals', pendingApprovals], ['Open tickets', openTickets], ['Meetings today', meetingsToday], ['Active users (7d)', users7d._sum.activeUsers ?? 0], ['Docs uploaded (7d)', docs7d._sum.docsUploaded ?? 0]].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value as number}</p></div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Usage trend (14 days)</h2>
        <div className="mt-3 space-y-2">
          {metrics.map((m) => (
            <div key={m.id} className="grid grid-cols-[120px_1fr_1fr] items-center gap-3 text-sm">
              <span>{m.date.toISOString().slice(0, 10)}</span>
              <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-500" style={{ width: `${Math.min(100, m.activeUsers)}%` }} /></div>
              <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, m.docsUploaded)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Recent Activity</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          {recent.map((a) => <p key={a.id}>• {a.action} · {a.createdAt.toISOString()}</p>)}
        </div>
      </div>
    </div>
  );
}
