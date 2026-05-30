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
  if (action.includes("RESOLVE") || action.includes("APPROVE")) return "if-status if-status-success";
  if (action.includes("ESCALATE") || action.includes("REJECT")) return "if-status if-status-warning";
  if (action.includes("LOGIN") || action.includes("VIEWED")) return "if-status if-status-pending";
  return "if-status if-status-draft";
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
  const nowDate = new Date(now);
  const in48h = new Date(now + 48 * 60 * 60 * 1000);
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since14 = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const staleSince = new Date(now - 72 * 60 * 60 * 1000);

  const [
    tenantCount,
    pendingApprovals,
    staleApprovals,
    openTickets,
    urgentTickets,
    meetingsToday,
    upcomingMeetings48h,
    users7d,
    docs7d,
    activeMetrics14,
    usageMetrics30,
    recent,
    docsRaw,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organizationVerification.count({ where: { status: "PENDING" } }),
    prisma.organizationVerification.count({
      where: { status: "PENDING", createdAt: { lte: staleSince } },
    }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.ticket.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        priority: { in: ["HIGH", "URGENT"] },
      },
    }),
    prisma.meeting.count({ where: { startAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) } } }),
    prisma.meeting.count({
      where: {
        status: "SCHEDULED",
        startAt: { gte: nowDate, lte: in48h },
      },
    }),
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
  const attentionNow = pendingApprovals + urgentTickets + staleApprovals;
  const healthySignals = [
    tenantCount > 0,
    staleApprovals === 0,
    urgentTickets === 0,
    upcomingMeetings48h > 0,
  ].filter(Boolean).length;
  const escalationEvents = recent.filter(
    (event) =>
      event.action.includes("ESCALATE") ||
      event.action.includes("REJECT") ||
      event.action.includes("PENDING"),
  );
  const throughputEvents = recent.filter(
    (event) => event.action.includes("APPROVE") || event.action.includes("RESOLVE"),
  );

  return (
    <div className="if-auth-page gap-5">
      <section className="if-auth-hero">
        <p className="if-marketing-eyebrow text-brand-accentStrong">InternFlow HQ</p>
        <h1 className="if-auth-title mt-2">Platform command center</h1>
        <p className="if-auth-subtitle max-w-3xl">
          Track tenant health, compliance throughput, support demand, and platform activity in one oversight workspace.
        </p>
      </section>

      <div className="if-auth-metrics md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Total tenants", tenantCount],
          ["Pending approvals", pendingApprovals],
          ["Open tickets", openTickets],
          ["Meetings today", meetingsToday],
          ["Active users (7d)", users7d._sum.activeUsers ?? 0],
          ["Docs uploaded (7d)", docs7d._sum.docsUploaded ?? 0],
        ].map(([label, value]) => (
          <div key={label as string} className="if-auth-metric">
            <p className="if-auth-metric-label">{label}</p>
            <p className="if-auth-metric-value">{value as number}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="if-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="if-panel-title">Operations board</h2>
            <span className="if-status if-status-warning">Attention now: {attentionNow}</span>
          </div>
          <p className="if-panel-copy mt-1">
            Prioritize compliance approvals and urgent support queues before platform growth tasks.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href="/hq/approvals" className="if-panel-muted rounded-xl px-3 py-2 text-sm">
              <p className="if-kpi-label">Pending approvals</p>
              <p className="mt-1 text-xl font-semibold text-brand-text">{pendingApprovals}</p>
            </a>
            <a href="/hq/approvals" className="if-panel-muted rounded-xl px-3 py-2 text-sm">
              <p className="if-kpi-label">Stale pending (72h+)</p>
              <p className="mt-1 text-xl font-semibold text-brand-text">{staleApprovals}</p>
            </a>
            <a href="/hq/support" className="if-panel-muted rounded-xl px-3 py-2 text-sm">
              <p className="if-kpi-label">Urgent tickets</p>
              <p className="mt-1 text-xl font-semibold text-brand-text">{urgentTickets}</p>
            </a>
            <a href="/hq/meetings" className="if-panel-muted rounded-xl px-3 py-2 text-sm">
              <p className="if-kpi-label">Meetings next 48h</p>
              <p className="mt-1 text-xl font-semibold text-brand-text">{upcomingMeetings48h}</p>
            </a>
          </div>
        </div>

        <div className="if-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="if-panel-title">Next actions</h2>
            <span className="if-status if-status-success">Healthy signals: {healthySignals}/4</span>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <a href="/hq/approvals" className="if-panel-muted block rounded-lg px-3 py-2 text-brand-textSoft">
              Review organization verifications
            </a>
            <a href="/hq/support" className="if-panel-muted block rounded-lg px-3 py-2 text-brand-textSoft">
              Clear urgent support queue
            </a>
            <a href="/hq/tenants" className="if-panel-muted block rounded-lg px-3 py-2 text-brand-textSoft">
              Check tenant activation momentum
            </a>
            <a href="/hq/settings" className="if-panel-muted block rounded-lg px-3 py-2 text-brand-textSoft">
              Validate platform configuration baselines
            </a>
          </div>
        </div>
      </section>

      <HQDashboardCharts activeSeries={activeSeries} docsSeries={docsSeries} />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="if-panel rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="if-panel-title">Escalations and risk events</h2>
            <p className="if-caption-text">{escalationEvents.length} recent</p>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {escalationEvents.length === 0 ? (
              <p className="if-empty-state text-sm">No escalations in the latest platform activity window.</p>
            ) : (
              escalationEvents.map((event) => (
                <div key={event.id} className="if-panel-muted rounded-xl border border-brand-border/55 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={activityTone(event.action)}>{activityLabel(event.action)}</span>
                    <span className="text-xs text-brand-muted">
                      {event.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                    </span>
                  </div>
                  <p className="if-body-text mt-2">{event.actor?.email ?? "System"}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="if-panel rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="if-panel-title">Recent activity</h2>
            <p className="if-caption-text">Last {recent.length} platform actions</p>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {recent.map((a) => (
              <div key={a.id} className="if-panel-muted rounded-xl border border-brand-border/55 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={activityTone(a.action)}>{activityLabel(a.action)}</span>
                  <span className="text-xs text-brand-muted">
                    {a.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                  </span>
                </div>
                <p className="if-body-text mt-2">{a.actor?.email ?? "System"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="if-panel rounded-2xl p-4 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="if-panel-title">Throughput highlights</h2>
            <p className="if-caption-text">{throughputEvents.length} positive events</p>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {throughputEvents.length === 0 ? (
              <p className="if-empty-state text-sm md:col-span-2">
                No approval/resolve highlights captured in this activity window.
              </p>
            ) : (
              throughputEvents.map((event) => (
                <div key={event.id} className="if-panel-muted rounded-xl border border-brand-border/55 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={activityTone(event.action)}>{activityLabel(event.action)}</span>
                    <span className="text-xs text-brand-muted">
                      {event.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                    </span>
                  </div>
                  <p className="if-body-text mt-2">{event.actor?.email ?? "System"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
