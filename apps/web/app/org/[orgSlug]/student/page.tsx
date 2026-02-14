import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";

export default async function StudentOrgPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");

  const [applications, enrollments, docs] = await Promise.all([
    prisma.application.findMany({ where: { userId: access.user.id, opportunity: { organizationId: access.membership.organizationId } }, include: { opportunity: true } }),
    prisma.enrollment.findMany({ where: { userId: access.user.id, organizationId: access.membership.organizationId }, include: { cohort: true, program: true } }),
    prisma.document.findMany({ where: { userId: access.user.id }, take: 5, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <h1 className="text-2xl font-semibold">Student lifecycle dashboard</h1>
      <p className="mt-2 text-sm text-slate-200">Track application outcomes, onboarding, documents, logbooks, and certificates.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Application timeline</h2>
          {applications.map((a) => <p key={a.id} className="mt-2 text-sm">{a.opportunity.title} · {a.status}</p>)}
        </section>
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Enrollments</h2>
          {enrollments.map((e) => <p key={e.id} className="mt-2 text-sm">{e.program.name} · {e.status}</p>)}
        </section>
      </div>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Document vault</h2>
        {docs.map((d) => <p key={d.id} className="mt-1 text-sm">{d.type} · {d.status}</p>)}
      </section>
    </AppShell>
  );
}
