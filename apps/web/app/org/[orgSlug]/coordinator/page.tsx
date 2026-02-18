import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";
import { ComplianceChart } from "@/components/charts/compliance-chart";

const COORDINATOR_ALLOWED = new Set(["COORDINATOR", "PROVIDER_ADMIN"]);

export default async function CoordinatorPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  if (!COORDINATOR_ALLOWED.has(access.membership.role)) redirect(`/org/${params.orgSlug}/${access.membership.role.toLowerCase().replace("_", "-")}`);

  const orgId = access.membership.organizationId;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [cohorts, enrollments, pendingDocs, logbooks] = await Promise.all([
    prisma.cohort.findMany({ where: { organizationId: orgId }, include: { program: true } }),
    prisma.enrollment.findMany({ where: { organizationId: orgId }, include: { user: true }, orderBy: { id: "desc" } }),
    prisma.document.findMany({
      where: {
        status: { in: ["SUBMITTED", "SCAN_PENDING", "SCAN_FAILED"] },
        user: { memberships: { some: { organizationId: orgId } } }
      },
      include: { user: true },
      take: 12,
      orderBy: { createdAt: "desc" }
    }),
    prisma.logbookEntry.findMany({
      where: { user: { memberships: { some: { organizationId: orgId } } } },
      include: { approvals: true, user: true },
      take: 14,
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <h1 className="text-2xl font-semibold">Coordinator dashboard</h1>
      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Cohorts and enrollments</h2>
          {cohorts.map((c) => (
            <p key={c.id} className="mt-1 text-sm">{c.name} · {c.program.name}</p>
          ))}
          <p className="mt-2 text-sm text-slate-300">Active learners: {enrollments.filter((e) => e.status === "ACTIVE").length}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Late logbook heatmap (count)</h2>
          <p className="mt-2 text-3xl font-bold text-amber-300">{logbooks.filter((l) => l.approvals.length === 0).length}</p>
          <p className="text-sm">Entries without approval.</p>
        </div>
      </section>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Compliance overview</h2>
        <ComplianceChart approved={enrollments.filter((e) => e.status === "ACTIVE").length} pending={pendingDocs.length} rejected={enrollments.filter((e) => e.status === "CANCELLED").length} />
      </section>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Missing documents queue</h2>
        {pendingDocs.map((d) => <p key={d.id} className="mt-1 text-sm">{d.user.email} · {d.type} · {d.status}</p>)}
      </section>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Stipend actions</h2>
        {enrollments.slice(0, 6).map((e) => (
          <form key={e.id} action={`/api/enrollments/${e.id}/stipend`} method="post" className="mt-2 flex items-center gap-2 text-sm">
            <span className="min-w-[180px]">{e.user.email}</span>
            <input name="month" defaultValue={e.stipendMonth ?? currentMonth} className="rounded border border-white/20 bg-slate-950/40 px-2 py-1" />
            <button className="rounded border border-white/20 px-2 py-1">Mark paid</button>
          </form>
        ))}
      </section>
    </AppShell>
  );
}
