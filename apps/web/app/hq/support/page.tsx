import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";

function badgeTone(status: string) {
  if (status === "RESOLVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default async function HQSupportPage({ searchParams }: { searchParams?: { status?: string; priority?: string; category?: string; orgId?: string } }) {
  const { platformMembership } = await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_OPS"]);
  const isOps = platformMembership.role === "PLATFORM_OPS";

  const selectedStatus = searchParams?.status ?? "ACTIVE";
  const baseFilters = {
    ...(searchParams?.priority ? { priority: searchParams.priority as any } : {}),
    ...(searchParams?.category ? { category: searchParams.category as any } : {}),
    ...(searchParams?.orgId ? { orgId: searchParams.orgId } : {})
  };

  const [tickets, orgs, activeCount, escalatedCount, resolvedCount] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...baseFilters,
        ...(selectedStatus === "ACTIVE" ? { status: { in: ["OPEN", "IN_PROGRESS"] } } : selectedStatus ? { status: selectedStatus as any } : {})
      },
      include: { organization: true, events: { orderBy: { createdAt: "desc" }, take: 8 } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 40
    }),
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.ticket.count({ where: { ...baseFilters, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.ticket.count({ where: { ...baseFilters, status: "IN_PROGRESS", priority: "URGENT" } }),
    prisma.ticket.count({ where: { ...baseFilters, status: "RESOLVED" } })
  ]);

  return (
    <div className="if-auth-page gap-4">
      <section className="if-auth-hero">
        <p className="if-kicker">Platform support</p>
        <h1 className="if-auth-title mt-2">Support Workspace</h1>
        <p className="if-auth-subtitle">{isOps ? "Ops queue: work escalated incidents, close blockers, and leave clear activity notes." : "Support queue: triage incidents, capture context, then escalate urgent blockers to Ops."}</p>
      </section>

      <div className="if-auth-metrics md:grid-cols-3">
        <div className="if-auth-metric"><p className="if-auth-metric-label">Active incidents</p><p className="if-auth-metric-value">{activeCount}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Escalated to Ops</p><p className="if-auth-metric-value">{escalatedCount}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Resolved (current filters)</p><p className="if-auth-metric-value">{resolvedCount}</p></div>
      </div>

      <form className="if-auth-form grid gap-2 md:grid-cols-5">
        <select name="status" defaultValue={selectedStatus} className="rounded border border-slate-300 bg-white text-brand-text px-2 py-2 text-sm">
          <option value="ACTIVE">Open + In progress</option>
          <option value="OPEN">Open only</option>
          <option value="IN_PROGRESS">In progress only</option>
          <option value="RESOLVED">Resolved only</option>
        </select>
        <select name="priority" defaultValue={searchParams?.priority ?? ""} className="rounded border border-slate-300 bg-white text-brand-text px-2 py-2 text-sm"><option value="">Any priority</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select>
        <select name="category" defaultValue={searchParams?.category ?? ""} className="rounded border border-slate-300 bg-white text-brand-text px-2 py-2 text-sm"><option value="">Any category</option><option>GENERAL</option><option>BILLING</option><option>TECHNICAL</option><option>ONBOARDING</option></select>
        <select name="orgId" defaultValue={searchParams?.orgId ?? ""} className="rounded border border-slate-300 bg-white text-brand-text px-2 py-2 text-sm"><option value="">Any tenant</option>{orgs.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
        <button className="if-btn if-btn-primary px-2 py-2 text-sm">Apply filters</button>
      </form>

      {tickets.map((t) => {
        const escalated = t.priority === "URGENT" && t.status === "IN_PROGRESS";
        const latest = t.events[0];
        return (
          <article key={t.id} className="if-panel rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-brand-text">{t.title}</p>
              <div className="flex gap-2 text-xs">
                <span className={`rounded-full border px-2 py-1 ${badgeTone(t.status)}`}>{t.status}</span>
                {escalated ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">ESCALATED</span> : null}
              </div>
            </div>

            <p className="mt-1 text-sm text-brand-muted">Tenant: {t.organization?.name ?? "Unknown"} - Priority: {t.priority} - Category: {t.category}</p>
            <p className="mt-2 text-sm text-brand-textSoft">{t.summary}</p>

            <div className="if-panel-muted mt-3 rounded-lg p-3 text-xs text-brand-textSoft">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-muted">Incident activity</p>
              {latest ? <p className="mt-1">Latest: {latest.event} - {latest.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</p> : <p className="mt-1">No activity yet.</p>}
              <ul className="mt-2 space-y-1">
                {t.events.map((e) => (
                  <li key={e.id}>- {e.createdAt.toISOString().replace("T", " ").slice(0, 16)} - {e.event}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex flex-wrap gap-2"><input type="hidden" name="action" value="REQUEST_INFO" /><input name="message" placeholder="Ask tenant for details" className="rounded border border-slate-300 bg-white text-brand-text px-2 py-1 text-xs" /><button className="rounded border border-slate-300 bg-white text-brand-text px-2 py-1 text-xs">Request info</button></form>
              {t.status !== "RESOLVED" ? <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex gap-2"><input type="hidden" name="action" value="RESOLVE" /><button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Resolve</button></form> : null}
              {!isOps && !escalated && t.status !== "RESOLVED" ? (
                <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex gap-2"><input type="hidden" name="action" value="ESCALATE_OPS" /><button className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700">Escalate to Ops</button></form>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
