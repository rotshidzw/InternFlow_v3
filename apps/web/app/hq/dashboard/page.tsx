import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";
import { HQDashboardCharts } from "@/components/hq/hq-dashboard-charts";

type DocsRow = { day: Date; count: number };

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildLastNDays(n: number) {
  return Array.from({ length: n }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - idx));
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

export default async function HQDashboardPage() {
  await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_SUPPORT", "PLATFORM_OPS", "PLATFORM_FINANCE"]);

  const now = Date.now();
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since14 = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [tenantCount, pendingApprovals, openTickets, meetingsToday, users7d, docs7d, activeMetrics14, usageMetrics30, recent, docsRaw] = await Promise.all([
    prisma.organization.count(),
    prisma.organizationVerification.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.meeting.count({ where: { startAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) } } }),
    prisma.usageMetricsDaily.aggregate({ _sum: { activeUsers: true }, where: { date: { gte: since7 } } }),
    prisma.usageMetricsDaily.aggregate({ _sum: { docsUploaded: true }, where: { date: { gte: since7 } } }),
    prisma.usageMetricsDaily.findMany({ where: { date: { gte: since14 } }, orderBy: { date: "asc" }, take: 14 }),
    prisma.usageMetricsDaily.findMany({ where: { date: { gte: since30 } }, orderBy: { date: "asc" } }),
    prisma.auditLog.findMany({ where: { scope: "PLATFORM" }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.$queryRaw<DocsRow[]>`
      SELECT DATE("createdAt")::timestamp AS day, COUNT(*)::int AS count
      FROM "Document"
      WHERE "createdAt" >= ${since30}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `
  ]);

  const activeMap = new Map(activeMetrics14.map((m) => [dateKey(m.date), m.activeUsers]));
  const activeSeries = buildLastNDays(14).map((d) => ({ label: d.toISOString().slice(5, 10), value: activeMap.get(dateKey(d)) ?? 0 }));

  const docsByDocumentTable = new Map(docsRaw.map((r) => [dateKey(new Date(r.day)), Number(r.count) || 0]));
  const docsByUsageTable = new Map(usageMetrics30.map((m) => [dateKey(m.date), m.docsUploaded]));
  const docsSeries = buildLastNDays(30).map((d) => {
    const key = dateKey(d);
    const fromDocs = docsByDocumentTable.get(key);
    const fromUsage = docsByUsageTable.get(key) ?? 0;
    return { label: d.toISOString().slice(5, 10), value: fromDocs ?? fromUsage };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">HQ Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[['Total tenants', tenantCount], ['Pending approvals', pendingApprovals], ['Open tickets', openTickets], ['Meetings today', meetingsToday], ['Active users (7d)', users7d._sum.activeUsers ?? 0], ['Docs uploaded (7d)', docs7d._sum.docsUploaded ?? 0]].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value as number}</p></div>
        ))}
      </div>

      <HQDashboardCharts activeSeries={activeSeries} docsSeries={docsSeries} />

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="font-semibold">Recent Activity</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          {recent.map((a) => <p key={a.id}>• {a.action} · {a.createdAt.toISOString()}</p>)}
        </div>
      </div>
    </div>
  );
}
