import { prisma } from "@internflow/db/src";
import { TrendChart } from "@/components/hq/trend-chart";

export default async function HQDashboardPage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [tenantCount, pendingApprovals, openTickets, meetingsToday, users7d, docs7d, metrics, recent] = await Promise.all([
    prisma.organization.count(),
    prisma.organizationVerification.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.meeting.count({ where: { startAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) } } }),
    prisma.usageMetricsDaily.aggregate({ _sum: { activeUsers: true }, where: { date: { gte: since } } }),
    prisma.usageMetricsDaily.aggregate({ _sum: { docsUploaded: true }, where: { date: { gte: since } } }),
    prisma.usageMetricsDaily.findMany({ orderBy: { date: "asc" }, take: 14 }),
    prisma.auditLog.findMany({ where: { scope: "PLATFORM" }, orderBy: { createdAt: "desc" }, take: 12 })
  ]);

  const series = metrics.map((m) => ({ label: m.date.toISOString().slice(5, 10), activeUsers: m.activeUsers, docsUploaded: m.docsUploaded }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">HQ Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[["Total tenants", tenantCount], ["Pending approvals", pendingApprovals], ["Open tickets", openTickets], ["Meetings today", meetingsToday], ["Active users (7d)", users7d._sum.activeUsers ?? 0], ["Docs uploaded (7d)", docs7d._sum.docsUploaded ?? 0]].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value as number}</p></div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart title="Daily Active Users" color="#2563eb" data={series.map((d) => ({ label: d.label, value: d.activeUsers }))} />
        <TrendChart title="Daily Docs Uploaded" color="#059669" data={series.map((d) => ({ label: d.label, value: d.docsUploaded }))} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="font-semibold">Recent Activity</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          {recent.map((a) => <p key={a.id}>• {a.action} · {a.createdAt.toISOString()}</p>)}
        </div>
      </div>
    </div>
  );
}
