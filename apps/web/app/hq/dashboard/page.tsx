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

function activityTone(action: string) {
  if (action.includes("RESOLVE") || action.includes("APPROVE")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (action.includes("ESCALATE") || action.includes("REJECT")) return "border-amber-200 bg-amber-50 text-amber-700";
  if (action.includes("LOGIN") || action.includes("VIEWED")) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function activityLabel(action: string) {
  return action
    .replace(/^HQ_/, "")
    .replace(/^LOGIN_/, "LOGIN ")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
    prisma.auditLog.findMany({ where: { scope: "PLATFORM" }, orderBy: { createdAt: "desc" }, take: 12, include: { actor: true } }),
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent Activity</h2>
          <p className="text-xs text-slate-500">Last {recent.length} platform actions</p>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {recent.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full border px-2 py-1 text-xs font-medium ${activityTone(a.action)}`}>{activityLabel(a.action)}</span>
                <span className="text-xs text-slate-500">{a.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</span>
              </div>
              <p className="mt-2 text-slate-700">{a.actor?.email ?? "System"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
