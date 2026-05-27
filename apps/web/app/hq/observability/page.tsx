import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";

function tone(level: "good" | "warn" | "risk") {
  if (level === "good") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (level === "warn") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

export default async function HQObservabilityPage() {
  await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_OPS", "PLATFORM_SUPPORT", "PLATFORM_FINANCE"]);

  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [metrics30, tickets7, meetings7, audits, tenantHealth] = await Promise.all([
    prisma.usageMetricsDaily.findMany({ include: { organization: true }, orderBy: { date: "desc" }, take: 120 }),
    prisma.ticket.findMany({ where: { createdAt: { gte: since7 } } }),
    prisma.meeting.findMany({ where: { createdAt: { gte: since7 } } }),
    prisma.auditLog.findMany({ where: { scope: "PLATFORM" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.organization.findMany({
      include: { usageMetrics: { where: { date: { gte: since30 } } }, tickets: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const avgActive = metrics30.length ? Math.round(metrics30.reduce((a, b) => a + b.activeUsers, 0) / metrics30.length) : 0;
  const avgDocs = metrics30.length ? Math.round(metrics30.reduce((a, b) => a + b.docsUploaded, 0) / metrics30.length) : 0;
  const avgApps = metrics30.length ? Math.round(metrics30.reduce((a, b) => a + b.applicationsCreated, 0) / metrics30.length) : 0;
  const openTickets7 = tickets7.filter((t) => t.status !== "RESOLVED").length;
  const resolvedRate = tickets7.length ? Math.round(((tickets7.length - openTickets7) / tickets7.length) * 100) : 100;
  const meetingsCreated = meetings7.length;

  const daily = [...metrics30]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-14)
    .map((m) => ({ label: m.date.toISOString().slice(5, 10), active: m.activeUsers, docs: m.docsUploaded }));

  const maxActive = Math.max(1, ...daily.map((d) => d.active));
  const maxDocs = Math.max(1, ...daily.map((d) => d.docs));

  const tenantRows = tenantHealth
    .map((org) => {
      const docs = org.usageMetrics.reduce((sum, m) => sum + m.docsUploaded, 0);
      const active = org.usageMetrics.reduce((sum, m) => sum + m.activeUsers, 0);
      const openTickets = org.tickets.filter((t) => t.status !== "RESOLVED").length;
      const score = Math.max(0, Math.min(100, Math.round((active / 20) * 35 + (docs / 15) * 35 + (openTickets === 0 ? 30 : Math.max(5, 30 - openTickets * 5)))));
      return { org, docs, active, openTickets, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const riskLabel: "good" | "warn" | "risk" = openTickets7 > 12 ? "risk" : openTickets7 > 5 ? "warn" : "good";

  return (
    <div className="if-auth-page gap-5">
      <section className="if-auth-hero">
        <p className="if-kicker">Platform telemetry</p>
        <h1 className="if-auth-title mt-2">Observability</h1>
        <p className="if-auth-subtitle">Platform health, tenant usage, and operational risk indicators for HQ operations.</p>
      </section>

      <div className="if-auth-metrics md:grid-cols-2 xl:grid-cols-5">
        <div className="if-auth-metric"><p className="if-auth-metric-label">Avg active users</p><p className="if-auth-metric-value">{avgActive}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Avg docs uploaded</p><p className="if-auth-metric-value">{avgDocs}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Avg applications</p><p className="if-auth-metric-value">{avgApps}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Open tickets (7d)</p><p className="if-auth-metric-value">{openTickets7}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Resolved rate (7d)</p><p className="if-auth-metric-value">{resolvedRate}%</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="if-panel rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="if-section-title">Usage trend (14d)</h2>
            <span className={`rounded-full border px-2 py-1 text-xs font-medium ${tone(riskLabel)}`}>Ticket risk: {riskLabel.toUpperCase()}</span>
          </div>
          <div className="space-y-2">
            {daily.map((d) => (
              <div key={d.label} className="grid grid-cols-[56px_1fr_1fr] items-center gap-2 text-xs text-brand-textSoft">
                <span>{d.label}</span>
                <div className="h-2 rounded bg-brand-surface"><div className="h-2 rounded bg-blue-500" style={{ width: `${Math.max(4, (d.active / maxActive) * 100)}%` }} /></div>
                <div className="h-2 rounded bg-brand-surface"><div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.max(4, (d.docs / maxDocs) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-brand-muted">Left bar = active users, right bar = docs uploaded.</p>
        </div>

        <div className="if-panel rounded-2xl p-4">
          <h2 className="if-section-title">Platform strategy</h2>
          <p className="mt-1 text-sm text-brand-textSoft">Grafana strategy: centralize tenant dashboards, alerts for queue lag, and incident triage runbooks.</p>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <a href="https://grafana.com/" target="_blank" className="if-btn if-btn-secondary justify-center px-3 py-2 text-center text-sm">Open Grafana docs</a>
            <a href="/hq/support" className="if-btn if-btn-secondary justify-center px-3 py-2 text-center text-sm">Open support queue</a>
            <a href="/hq/meetings" className="if-btn if-btn-secondary justify-center px-3 py-2 text-center text-sm">Open meetings</a>
            <form action="/api/hq/observability/export" method="get">
              <button className="if-btn if-btn-secondary w-full justify-center px-3 py-2 text-sm">Export metrics CSV</button>
            </form>
          </div>
          <p className="mt-3 text-xs text-brand-muted">Meetings created in last 7 days: {meetingsCreated}</p>
        </div>
      </div>

      <div className="if-panel rounded-2xl p-4">
        <h2 className="if-section-title">Top tenant health (30d)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-brand-muted"><tr><th className="px-2 py-1">Tenant</th><th className="px-2 py-1">Active users</th><th className="px-2 py-1">Docs</th><th className="px-2 py-1">Open tickets</th><th className="px-2 py-1">Health score</th></tr></thead>
            <tbody>
              {tenantRows.map((row) => (
                <tr key={row.org.id} className="border-t border-brand-border/40">
                  <td className="px-2 py-2 font-medium">{row.org.name}</td>
                  <td className="px-2 py-2">{row.active}</td>
                  <td className="px-2 py-2">{row.docs}</td>
                  <td className="px-2 py-2">{row.openTickets}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full border px-2 py-1 text-xs ${row.score >= 75 ? tone("good") : row.score >= 45 ? tone("warn") : tone("risk")}`}>{row.score}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="if-panel rounded-2xl p-4">
        <h2 className="if-section-title">Recent platform audit events</h2>
        <div className="mt-2 space-y-1 text-sm text-brand-textSoft">
          {audits.length === 0 ? <p className="text-brand-muted">No recent platform audit events.</p> : audits.map((a) => (
            <p key={a.id}>- {a.createdAt.toISOString()} - {a.action}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
