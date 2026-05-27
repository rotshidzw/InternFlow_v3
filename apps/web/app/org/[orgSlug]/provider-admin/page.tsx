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
    prisma.application.findMany({ where: { opportunity: { organizationId: access.membership.organizationId } }, include: { user: true, opportunity: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={org.name}>
      <div className="if-auth-page">
        <section className="if-auth-hero">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Provider Admin</p>
          <h1 className="if-auth-title mt-2">Delivery management workspace</h1>
          <p className="if-auth-subtitle">Org status: {org.status}. Manage opportunities, applicant flow, and staffing actions from one pane.</p>
        </section>

        <section className="if-panel rounded-xl p-4">
          <h2 className="font-semibold text-brand-text">Opportunities</h2>
          <div className="mt-2 space-y-2 text-sm text-brand-textSoft">
            {opportunities.map((opportunity) => (
              <p key={opportunity.id}>
                {opportunity.title} - {opportunity.type} - {opportunity.status} - {opportunity.applications.length} applicants
              </p>
            ))}
            {opportunities.length === 0 ? <p className="text-brand-muted">No opportunities yet.</p> : null}
          </div>
        </section>

        <section className="if-auth-form">
          <h2 className="font-semibold text-brand-text">Create opportunity</h2>
          <form action={`/api/org/${params.orgSlug}/opportunities`} method="post" className="if-filter-grid mt-3 md:grid-cols-4">
            <input name="title" placeholder="Opportunity title" className="rounded px-2 py-2" required />
            <select name="type" className="rounded px-2 py-2">
              <option value="INTERNSHIP">Internship</option>
              <option value="LEARNERSHIP">Learnership</option>
              <option value="MENTORSHIP">Mentorship</option>
              <option value="SKILLS_PROGRAM">Skills Program</option>
            </select>
            <input name="description" placeholder="Description" className="rounded px-2 py-2 md:col-span-2" required />
            <button className="if-btn if-btn-primary px-3 py-2 text-sm md:col-span-4">Publish opportunity</button>
          </form>
        </section>

        <section className="if-panel rounded-xl p-4">
          <h2 className="font-semibold text-brand-text">Applicants pipeline</h2>
          <div className="mt-2 space-y-2">
            {applicants.map((application) => (
              <div key={application.id} className="if-panel-muted rounded-lg border border-brand-border/60 p-3 text-sm">
                <p className="text-brand-textSoft">{application.user.email} - {application.opportunity.title} - {application.status}</p>
                <div className="mt-2 flex gap-2">
                  {(["SHORTLISTED", "ACCEPTED", "REJECTED"] as const).map((status) => (
                    <form key={status} action={`/api/applications/${application.id}/status`} method="post">
                      <input type="hidden" name="status" value={status} />
                      <button className="if-btn if-btn-secondary px-2 py-1 text-xs">{status}</button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
            {applicants.length === 0 ? <p className="if-empty-state text-sm">No applicants captured yet.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
