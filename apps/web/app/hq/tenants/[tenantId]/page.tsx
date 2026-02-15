import { prisma } from "@internflow/db/src";

export default async function TenantDetailPage({ params }: { params: { tenantId: string } }) {
  const tenant = await prisma.organization.findUnique({ where: { id: params.tenantId } });
  if (!tenant) return <div>Tenant not found.</div>;

  const [verifications, metrics, tickets, meetings] = await Promise.all([
    prisma.organizationVerification.findMany({ where: { orgId: tenant.id }, orderBy: { createdAt: "desc" }, take: 1 }),
    prisma.usageMetricsDaily.findMany({ where: { orgId: tenant.id }, orderBy: { date: "desc" }, take: 14 }),
    prisma.ticket.findMany({ where: { orgId: tenant.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.meeting.findMany({ where: { orgId: tenant.id }, orderBy: { startAt: "desc" }, take: 5 })
  ]);

  const verification = verifications[0];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">{tenant.name}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Profile</h2>
          <p className="mt-2 text-sm">Status: {tenant.status}</p>
          <p className="text-sm">Contact: {tenant.contactPerson ?? "N/A"}</p>
          <p className="text-sm">Country/Province: {tenant.country} / {tenant.province}</p>
          <form action={`/api/hq/impersonate/${tenant.id}`} method="post" className="mt-3">
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Impersonate tenant admin (dev)</button>
          </form>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Compliance checklist</h2>
          <p className="mt-2 text-sm">Verification status: {verification?.status ?? "PENDING"}</p>
          <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(verification?.docsJson ?? {}, null, 2)}</pre>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Usage metrics (last 14 days)</h2>
        {metrics.map((m) => <p key={m.id} className="mt-1 text-sm">{m.date.toISOString().slice(0,10)} · users {m.activeUsers} · docs {m.docsUploaded}</p>)}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Last 10 tickets</h2>
          {tickets.map((t) => <p key={t.id} className="mt-1 text-sm">{t.title} · {t.status} · {t.priority}</p>)}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Last 5 meetings</h2>
          {meetings.map((m) => <p key={m.id} className="mt-1 text-sm">{m.title} · {m.status} · {m.startAt.toISOString().slice(0,10)}</p>)}
        </div>
      </div>
    </div>
  );
}
