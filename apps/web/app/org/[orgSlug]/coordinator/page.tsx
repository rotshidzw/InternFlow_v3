import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";

export default async function CoordinatorPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");

  const [cohorts, enrollments, pendingDocs, logbooks] = await Promise.all([
    prisma.cohort.findMany({ where: { organizationId: access.membership.organizationId }, include: { program: true } }),
    prisma.enrollment.findMany({ where: { organizationId: access.membership.organizationId }, include: { user: true } }),
    prisma.document.findMany({ where: { status: "PENDING", user: { memberships: { some: { organizationId: access.membership.organizationId } } } }, include: { user: true }, take: 10 }),
    prisma.logbookEntry.findMany({ include: { approvals: true }, take: 10, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <h1 className="text-2xl font-semibold">Coordinator dashboard</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Cohorts</h2>
          {cohorts.map((c) => <p key={c.id} className="mt-2 text-sm">{c.name} · {c.program.name}</p>)}
        </section>
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Enrollments</h2>
          {enrollments.map((e) => <p key={e.id} className="mt-2 text-sm">{e.user.email} · {e.status}</p>)}
        </section>
      </div>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Missing docs / compliance queue</h2>
        {pendingDocs.map((d) => <p key={d.id} className="mt-1 text-sm">{d.user.email} · {d.type} pending</p>)}
      </section>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Logbook approvals queue</h2>
        {logbooks.map((l) => <p key={l.id} className="mt-1 text-sm">{l.summary.slice(0, 70)}...</p>)}
      </section>
    </AppShell>
  );
}
