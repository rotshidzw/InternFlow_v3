import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";

export default async function ProviderAdminPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");

  const [org, opportunities, applicants] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: access.membership.organizationId } }),
    prisma.opportunity.findMany({ where: { organizationId: access.membership.organizationId }, include: { applications: true } }),
    prisma.application.findMany({ where: { opportunity: { organizationId: access.membership.organizationId } }, include: { user: true } })
  ]);

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={org.name}>
      <h1 className="text-2xl font-semibold">Provider Admin dashboard</h1>
      <p className="mt-2 text-sm text-slate-200">Org status: {org.status}. Manage programs, cohorts, opportunities, and applicants.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Opportunities</h2>
          {opportunities.map((o) => <p key={o.id} className="mt-2 text-sm">{o.title} · {o.type} · {o.status}</p>)}
        </section>
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Applicants</h2>
          {applicants.map((a) => <p key={a.id} className="mt-2 text-sm">{a.user.email} · {a.status}</p>)}
        </section>
      </div>
    </AppShell>
  );
}
