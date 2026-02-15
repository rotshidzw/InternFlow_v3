import { prisma } from "@internflow/db/src";

function statusTone(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function asUploaded(value: unknown) {
  return String(value ?? "").toLowerCase() === "uploaded";
}

export default async function TenantDetailPage({ params }: { params: { tenantId: string } }) {
  const tenant = await prisma.organization.findUnique({ where: { id: params.tenantId }, include: { creator: true } });
  if (!tenant) return <div>Tenant not found.</div>;

  const [verifications, metrics14, docs30, tickets, meetings, contacts, orgDocs] = await Promise.all([
    prisma.organizationVerification.findMany({ where: { orgId: tenant.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.usageMetricsDaily.findMany({ where: { orgId: tenant.id }, orderBy: { date: "desc" }, take: 14 }),
    prisma.document.findMany({ where: { organizationId: tenant.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.ticket.findMany({ where: { orgId: tenant.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.meeting.findMany({ where: { orgId: tenant.id }, orderBy: { startAt: "desc" }, take: 5 }),
    prisma.membership.findMany({ where: { organizationId: tenant.id, role: { in: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] } }, include: { user: true }, take: 20 }),
    prisma.organizationDocument.findMany({ where: { orgId: tenant.id }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);

  const verification = verifications[0];
  const docsJson = (verification?.docsJson as Record<string, unknown> | null) ?? {};
  const checklist = [
    ["CIPC", docsJson.CIPC],
    ["BBBEE", docsJson.BBBEE],
    ["Tax Clearance", docsJson.taxClearance],
    ["Proof of Address", docsJson.proofOfAddress]
  ] as const;
  const checklistDone = checklist.filter(([, value]) => asUploaded(value)).length;

  const totalUsers14 = metrics14.reduce((sum, m) => sum + m.activeUsers, 0);
  const totalDocs14 = metrics14.reduce((sum, m) => sum + m.docsUploaded, 0);
  const totalDocs30 = docs30.filter((d) => d.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
  const openTickets = tickets.filter((t) => t.status !== "RESOLVED").length;
  const meetingsNext30 = meetings.filter((m) => m.startAt >= new Date() && m.startAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;
  const health = tenant.status === "APPROVED" ? 90 : tenant.status === "PENDING_REVIEW" ? 55 : 30;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-white to-slate-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{tenant.name}</h1>
            <p className="mt-1 text-sm text-slate-600">Tenant workspace profile for HQ approvals, government readiness and account oversight.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(tenant.status)}`}>{tenant.status.replace("_", " ")}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">{tenant.type.replace("_", " ")}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">Health {health}%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Active users (14d)", totalUsers14],
          ["Docs uploaded (14d)", totalDocs14],
          ["Docs uploaded (30d)", totalDocs30],
          ["Open tickets", openTickets],
          ["Meetings next 30d", meetingsNext30]
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{value as number}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <h2 className="font-semibold">Profile & onboarding info</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Contact person</dt><dd>{tenant.contactPerson ?? "Not set"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Country / Province</dt><dd>{tenant.country ?? "-"} / {tenant.province ?? "-"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Slug</dt><dd>{tenant.slug}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Created by</dt><dd>{tenant.creator?.email ?? "Unknown"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Created at</dt><dd>{tenant.createdAt.toISOString().slice(0, 10)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">Tenant communication emails: {contacts.map((c) => c.user.email).join(", ") || "None"}</p>
          <form action={`/api/hq/impersonate/${tenant.id}`} method="post" className="mt-3">
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition hover:bg-slate-50">Impersonate tenant admin (dev)</button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <h2 className="font-semibold">Government compliance readiness</h2>
          <p className="mt-1 text-sm text-slate-600">{checklistDone}/{checklist.length} core documents marked uploaded in latest verification.</p>
          <div className="mt-3 space-y-2">
            {checklist.map(([label, value]) => {
              const ok = asUploaded(value);
              return (
                <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-sm">
                  <span>{label}</span>
                  <span className={`rounded-full px-2 py-1 text-xs ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{ok ? "Uploaded" : String(value ?? "Missing")}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Verification status: {verification?.status ?? "PENDING"}{verification?.reason ? ` · ${verification.reason}` : ""}</p>
        </div>
      </div>

      <details open className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">Operational records (roll up / down)</summary>
        <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
          <div>
            <h3 className="font-medium">Last 10 tickets</h3>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              {tickets.length === 0 ? <p className="text-slate-500">No tickets.</p> : tickets.map((t) => <p key={t.id}>{t.title} · {t.status} · {t.priority}</p>)}
            </div>
          </div>
          <div>
            <h3 className="font-medium">Last 5 meetings</h3>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              {meetings.length === 0 ? <p className="text-slate-500">No meetings.</p> : meetings.map((m) => <p key={m.id}>{m.title} · {m.status} · {m.startAt.toISOString().slice(0, 10)}</p>)}
            </div>
          </div>
          <div>
            <h3 className="font-medium">Organization documents</h3>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              {orgDocs.length === 0 ? <p className="text-slate-500">No organization documents uploaded.</p> : orgDocs.slice(0, 8).map((d) => <p key={d.id}>{d.category} · {d.status} · {d.createdAt.toISOString().slice(0, 10)}</p>)}
            </div>
          </div>
          <div>
            <h3 className="font-medium">Verification history</h3>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              {verifications.length === 0 ? <p className="text-slate-500">No verification history.</p> : verifications.map((v) => <p key={v.id}>{v.createdAt.toISOString().slice(0, 10)} · {v.status}{v.reason ? ` · ${v.reason}` : ""}</p>)}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
