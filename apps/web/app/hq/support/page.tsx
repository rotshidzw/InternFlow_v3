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

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(selectedStatus === "ACTIVE" ? { status: { in: ["OPEN", "IN_PROGRESS"] } } : selectedStatus ? { status: selectedStatus as any } : {}),
      ...(searchParams?.priority ? { priority: searchParams.priority as any } : {}),
      ...(searchParams?.category ? { category: searchParams.category as any } : {}),
      ...(searchParams?.orgId ? { orgId: searchParams.orgId } : {})
    },
    include: { organization: true, events: { orderBy: { createdAt: "desc" }, take: 6 } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 40
  });

  const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });

  const totalActive = tickets.filter((t) => t.status !== "RESOLVED").length;
  const escalatedCount = tickets.filter((t) => t.priority === "URGENT" && t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Support Workspace</h1>
      <p className="text-sm text-slate-600">{isOps ? "Ops queue: work escalated incidents, close blockers, and leave clear activity notes." : "Support queue: triage incidents, capture context, then escalate urgent blockers to Ops."}</p>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-xs text-slate-500">Active incidents</p><p className="text-2xl font-semibold">{totalActive}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-xs text-slate-500">Escalated to Ops</p><p className="text-2xl font-semibold">{escalatedCount}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-xs text-slate-500">Resolved in current view</p><p className="text-2xl font-semibold">{resolvedCount}</p></div>
      </div>

      <form className="grid gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur md:grid-cols-5">
        <select name="status" defaultValue={selectedStatus} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm">
          <option value="ACTIVE">Open + In progress</option>
          <option value="OPEN">Open only</option>
          <option value="IN_PROGRESS">In progress only</option>
          <option value="RESOLVED">Resolved only</option>
        </select>
        <select name="priority" defaultValue={searchParams?.priority ?? ""} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm"><option value="">Any priority</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select>
        <select name="category" defaultValue={searchParams?.category ?? ""} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm"><option value="">Any category</option><option>GENERAL</option><option>BILLING</option><option>TECHNICAL</option><option>ONBOARDING</option></select>
        <select name="orgId" defaultValue={searchParams?.orgId ?? ""} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm"><option value="">Any tenant</option>{orgs.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
        <button className="rounded bg-slate-900 px-2 py-2 text-sm text-white">Apply filters</button>
      </form>

      {tickets.map((t) => {
        const escalated = t.priority === "URGENT" && t.status === "IN_PROGRESS";
        const latest = t.events[0];
        return (
          <article key={t.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{t.title}</p>
              <div className="flex gap-2 text-xs">
                <span className={`rounded-full border px-2 py-1 ${badgeTone(t.status)}`}>{t.status}</span>
                {escalated ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">ESCALATED</span> : null}
              </div>
            </div>

            <p className="mt-1 text-sm text-slate-600">Tenant: {t.organization?.name ?? "Unknown"} · Priority: {t.priority} · Category: {t.category}</p>
            <p className="mt-2 text-sm">{t.summary}</p>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-medium">Incident activity</p>
              {latest ? <p className="mt-1">Latest: {latest.event} · {latest.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</p> : <p className="mt-1">No activity yet.</p>}
              <ul className="mt-2 space-y-1">
                {t.events.map((e) => (
                  <li key={e.id}>• {e.createdAt.toISOString().replace("T", " ").slice(0, 16)} · {e.event}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex flex-wrap gap-2"><input type="hidden" name="action" value="REQUEST_INFO" /><input name="message" placeholder="Ask tenant for details" className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-1 text-xs" /><button className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-1 text-xs">Request info</button></form>
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
