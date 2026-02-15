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
    prisma.application.findMany({ where: { opportunity: { organizationId: access.membership.organizationId } }, include: { user: true, opportunity: true }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={org.name}>
      <h1 className="text-2xl font-semibold">Provider Admin dashboard</h1>
      <p className="mt-2 text-sm text-slate-200">Org status: {org.status}. Manage opportunities, applicants, and exports.</p>
      <section className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Opportunities</h2>
        {opportunities.map((o) => <p key={o.id} className="mt-2 text-sm">{o.title} · {o.type} · {o.status} · {o.applications.length} applicants</p>)}
      </section>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Create opportunity</h2>
        <form action={`/api/org/${params.orgSlug}/opportunities`} method="post" className="mt-2 grid gap-2 md:grid-cols-4">
          <input name="title" placeholder="Opportunity title" className="rounded border border-white/20 bg-slate-950/40 px-2 py-2" required />
          <select name="type" className="rounded border border-white/20 bg-slate-950/40 px-2 py-2">
            <option value="INTERNSHIP">Internship</option>
            <option value="LEARNERSHIP">Learnership</option>
            <option value="MENTORSHIP">Mentorship</option>
            <option value="SKILLS_PROGRAM">Skills Program</option>
          </select>
          <input name="description" placeholder="Description" className="rounded border border-white/20 bg-slate-950/40 px-2 py-2 md:col-span-2" required />
          <button className="rounded bg-emerald-500 px-3 py-2 text-slate-950 md:col-span-4">Publish opportunity</button>
        </form>
      </section>
      <section className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Applicants pipeline</h2>
        <div className="mt-2 space-y-2">
          {applicants.map((a) => (
            <div key={a.id} className="rounded-lg border border-white/10 p-2 text-sm">
              <p>{a.user.email} · {a.opportunity.title} · {a.status}</p>
              <div className="mt-2 flex gap-2">
                {(["SHORTLISTED", "ACCEPTED", "REJECTED"] as const).map((status) => (
                  <form key={status} action={`/api/applications/${a.id}/status`} method="post">
                    <input type="hidden" name="status" value={status} />
                    <button className="rounded border border-white/20 px-2 py-1 text-xs">{status}</button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
