import { prisma } from "@internflow/db/src";

export default async function HQSupportPage({ searchParams }: { searchParams?: { status?: string; priority?: string; category?: string; orgId?: string } }) {
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(searchParams?.status ? { status: searchParams.status as any } : {}),
      ...(searchParams?.priority ? { priority: searchParams.priority as any } : {}),
      ...(searchParams?.category ? { category: searchParams.category as any } : {}),
      ...(searchParams?.orgId ? { orgId: searchParams.orgId } : {})
    },
    include: { organization: true, events: true },
    orderBy: { createdAt: "desc" },
    take: 40
  });
  const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Support Workspace</h1>
      <form className="grid gap-2 md:grid-cols-4">
        <select name="status" className="rounded border border-slate-300 px-2 py-2 text-sm"><option value="">Any status</option><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option></select>
        <select name="priority" className="rounded border border-slate-300 px-2 py-2 text-sm"><option value="">Any priority</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select>
        <select name="category" className="rounded border border-slate-300 px-2 py-2 text-sm"><option value="">Any category</option><option>GENERAL</option><option>BILLING</option><option>TECHNICAL</option><option>ONBOARDING</option></select>
        <select name="orgId" className="rounded border border-slate-300 px-2 py-2 text-sm"><option value="">Any tenant</option>{orgs.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      </form>

      {tickets.map((t) => (
        <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-semibold">{t.title} · {t.status}</p>
          <p className="text-sm text-slate-600">{t.organization?.name ?? "Unknown tenant"} · {t.priority} · {t.category}</p>
          <p className="mt-2 text-sm">{t.summary}</p>
          <div className="mt-2 text-xs text-slate-500">{t.events.map((e) => e.event).join(" | ")}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex gap-2"><input type="hidden" name="action" value="REQUEST_INFO" /><button className="rounded border border-slate-300 px-2 py-1 text-xs">Request info</button></form>
            <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex gap-2"><input type="hidden" name="action" value="RESOLVE" /><button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Resolve</button></form>
            <form action={`/api/hq/support/${t.id}/action`} method="post" className="flex gap-2"><input type="hidden" name="action" value="ESCALATE_OPS" /><button className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700">Escalate to Ops</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
