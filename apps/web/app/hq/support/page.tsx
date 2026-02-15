import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";

export default async function HQSupportPage({ searchParams }: { searchParams?: { status?: string; priority?: string; category?: string; orgId?: string } }) {
  const { platformMembership } = await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_OPS"]);
  const isOps = platformMembership.role === "PLATFORM_OPS";

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(searchParams?.status ? { status: searchParams.status as any } : {}),
      ...(searchParams?.priority ? { priority: searchParams.priority as any } : {}),
      ...(searchParams?.category ? { category: searchParams.category as any } : {}),
      ...(searchParams?.orgId ? { orgId: searchParams.orgId } : {})
    },
    include: { organization: true, events: { orderBy: { createdAt: "desc" }, take: 6 } },
    orderBy: { createdAt: "desc" },
    take: 40
  });
  const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Support Workspace</h1>
      <p className="text-sm text-slate-600">{isOps ? "Ops queue: tickets escalated to operations should be handled and resolved here." : "Support queue: triage tickets and escalate urgent cases to Ops."}</p>
      <form className="grid gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur md:grid-cols-5">
        <select name="status" defaultValue={searchParams?.status ?? ""} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm"><option value="">Any status</option><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option></select>
        <select name="priority" defaultValue={searchParams?.priority ?? ""} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm"><option value="">Any priority</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select>
        <select name="category" defaultValue={searchParams?.category ?? ""} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm"><option value="">Any category</option><option>GENERAL</option><option>BILLING</option><option>TECHNICAL</option><option>ONBOARDING</option></select>
        <select name="orgId" defaultValue={searchParams?.orgId ?? ""} className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm"><option value="">Any tenant</option>{orgs.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
        <button className="rounded bg-slate-900 px-2 py-2 text-sm text-white">Apply filters</button>
      </form>

      {tickets.map((t) => {
        const escalated = t.priority === "URGENT" && t.status === "IN_PROGRESS";
        return (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="font-semibold">{t.title} · {t.status} {escalated ? "· ESCALATED" : ""}</p>
            <p className="text-sm text-slate-600">{t.organization?.name ?? "Unknown tenant"} · {t.priority} · {t.category}</p>
            <p className="mt-2 text-sm">{t.summary}</p>
            <div className="mt-2 text-xs text-slate-500">{t.events.map((e) => e.event).join(" | ")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex flex-wrap gap-2"><input type="hidden" name="action" value="REQUEST_INFO" /><input name="message" placeholder="Ask tenant for details" className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-1 text-xs" /><button className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-1 text-xs">Request info</button></form>
              <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex gap-2"><input type="hidden" name="action" value="RESOLVE" /><button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Resolve</button></form>
              {!isOps && !escalated ? (
                <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex gap-2"><input type="hidden" name="action" value="ESCALATE_OPS" /><button className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700">Escalate to Ops</button></form>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
