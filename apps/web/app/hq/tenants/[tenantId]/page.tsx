import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";

function statusTone(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function asUploaded(value: unknown) {
  return String(value ?? "").toLowerCase() === "uploaded";
}

export default async function TenantDetailPage({ params }: { params: { tenantId: string } }) {
  await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_SUPPORT", "PLATFORM_OPS"]);
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
    <div className="if-auth-page gap-5">
      <section className="if-auth-hero">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="if-kicker">Tenant workspace profile</p>
            <h1 className="if-auth-title mt-2">{tenant.name}</h1>
            <p className="if-auth-subtitle">Tenant workspace profile for HQ approvals, government readiness and account oversight.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(tenant.status)}`}>{tenant.status.replace("_", " ")}</span>
            <span className="if-status if-status-draft">{tenant.type.replace("_", " ")}</span>
            <span className="if-status if-status-pending">Health {health}%</span>
          </div>
        </div>
      </section>

      <div className="if-auth-metrics md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Active users (14d)", totalUsers14],
          ["Docs uploaded (14d)", totalDocs14],
          ["Docs uploaded (30d)", totalDocs30],
          ["Open tickets", openTickets],
          ["Meetings next 30d", meetingsNext30]
        ].map(([label, value]) => (
          <div key={label as string} className="if-auth-metric">
            <p className="if-auth-metric-label">{label}</p>
            <p className="if-auth-metric-value">{value as number}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="if-panel rounded-2xl p-4">
          <h2 className="if-section-title">Profile & onboarding info</h2>
          <dl className="mt-3 space-y-2 text-sm text-brand-textSoft">
            <div className="flex justify-between gap-4"><dt className="text-brand-muted">Contact person</dt><dd>{tenant.contactPerson ?? "Not set"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-muted">Country / Province</dt><dd>{tenant.country ?? "-"} / {tenant.province ?? "-"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-muted">Slug</dt><dd>{tenant.slug}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-muted">Created by</dt><dd>{tenant.creator?.email ?? "Unknown"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-muted">Created at</dt><dd>{tenant.createdAt.toISOString().slice(0, 10)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-brand-muted">Tenant communication emails: {contacts.map((c) => c.user.email).join(", ") || "None"}</p>
          <form action={`/api/hq/impersonate/${tenant.id}`} method="post" className="mt-3">
            <button className="if-btn if-btn-secondary px-3 py-2 text-sm">Impersonate tenant admin (dev)</button>
          </form>
        </div>

        <div className="if-panel rounded-2xl p-4">
          <h2 className="if-section-title">Government compliance readiness</h2>
          <p className="mt-1 text-sm text-brand-textSoft">{checklistDone}/{checklist.length} core documents marked uploaded in latest verification.</p>
          <div className="mt-3 space-y-2">
            {checklist.map(([label, value]) => {
              const ok = asUploaded(value);
              return (
                <div key={label} className="if-panel-muted flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                  <span className="text-brand-textSoft">{label}</span>
                  <span className={`rounded-full px-2 py-1 text-xs ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{ok ? "Uploaded" : String(value ?? "Missing")}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-brand-muted">Verification status: {verification?.status ?? "PENDING"}{verification?.reason ? ` - ${verification.reason}` : ""}</p>
        </div>
      </div>

      <details open className="if-panel group rounded-2xl">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand-text">Operational records (roll up / down)</summary>
        <div className="grid gap-4 border-t border-brand-border/50 p-4 md:grid-cols-2">
          <div>
            <h3 className="if-card-title">Last 10 tickets</h3>
            <div className="mt-2 space-y-1 text-sm text-brand-textSoft">
              {tickets.length === 0 ? <p className="text-brand-muted">No tickets.</p> : tickets.map((t) => <p key={t.id}>{t.title} - {t.status} - {t.priority}</p>)}
            </div>
          </div>
          <div>
            <h3 className="if-card-title">Last 5 meetings</h3>
            <div className="mt-2 space-y-1 text-sm text-brand-textSoft">
              {meetings.length === 0 ? <p className="text-brand-muted">No meetings.</p> : meetings.map((m) => <p key={m.id}>{m.title} - {m.status} - {m.startAt.toISOString().slice(0, 10)}</p>)}
            </div>
          </div>
          <div>
            <h3 className="if-card-title">Organization documents</h3>
            <div className="mt-2 space-y-1 text-sm text-brand-textSoft">
              {orgDocs.length === 0 ? <p className="text-brand-muted">No organization documents uploaded.</p> : orgDocs.slice(0, 8).map((d) => <p key={d.id}>{d.category} - {d.status} - {d.createdAt.toISOString().slice(0, 10)}</p>)}
            </div>
          </div>
          <div>
            <h3 className="if-card-title">Verification history</h3>
            <div className="mt-2 space-y-1 text-sm text-brand-textSoft">
              {verifications.length === 0 ? <p className="text-brand-muted">No verification history.</p> : verifications.map((v) => <p key={v.id}>{v.createdAt.toISOString().slice(0, 10)} - {v.status}{v.reason ? ` - ${v.reason}` : ""}</p>)}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
