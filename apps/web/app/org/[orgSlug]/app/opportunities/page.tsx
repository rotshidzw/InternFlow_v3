import { prisma } from "@internflow/db/src";
import { BriefcaseBusiness, CircleDot, FileText, Users } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";

function statusTone(status: string) {
  if (status === "PUBLISHED") return "if-status if-status-success";
  if (status === "DRAFT") return "if-status if-status-draft";
  return "if-status if-status-pending";
}

export default async function OpportunitiesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);

  const [programs, opportunities] = await Promise.all([
    prisma.program.findMany({
      where: { organizationId: access.membership.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.opportunity.findMany({
      where: { organizationId: access.membership.organizationId },
      orderBy: { title: "asc" },
      include: { applications: true, program: true },
    }),
  ]);

  const publishedCount = opportunities.filter((opportunity) => opportunity.status === "PUBLISHED").length;
  const draftCount = opportunities.filter((opportunity) => opportunity.status === "DRAFT").length;
  const applicantsCount = opportunities.reduce((sum, opportunity) => sum + opportunity.applications.length, 0);

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Recruitment Design</p>
        <h1 className="if-auth-title mt-2">Opportunities</h1>
        <p className="if-auth-subtitle">
          Create, publish, and track hiring pipelines with structured programme linkage and clear stage control.
        </p>

        <div className="if-auth-metrics mt-3 md:grid-cols-3">
          <div className="if-auth-metric">
            <p className="if-auth-metric-label">Published</p>
            <p className="if-auth-metric-value">{publishedCount}</p>
          </div>
          <div className="if-auth-metric">
            <p className="if-auth-metric-label">Drafts</p>
            <p className="if-auth-metric-value">{draftCount}</p>
          </div>
          <div className="if-auth-metric">
            <p className="if-auth-metric-label">Applicants</p>
            <p className="if-auth-metric-value">{applicantsCount}</p>
          </div>
        </div>
      </section>

      <form action={`/api/org/${params.orgSlug}/opportunities`} method="post" className="if-auth-form space-y-3">
        <div className="if-filter-grid md:grid-cols-3">
          <input required name="title" placeholder="Opportunity title" className="rounded-xl px-3 py-2 text-sm md:col-span-2" />
          <select name="type" className="rounded-xl px-3 py-2 text-sm">
            <option>INTERNSHIP</option>
            <option>LEARNERSHIP</option>
            <option>SKILLS_PROGRAM</option>
            <option>MENTORSHIP</option>
          </select>
        </div>

        <div className="if-filter-grid md:grid-cols-3">
          <select name="programId" className="rounded-xl px-3 py-2 text-sm">
            <option value="">No program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          <input name="capacity" type="number" min={1} defaultValue={50} placeholder="Capacity" className="rounded-xl px-3 py-2 text-sm" />
          <input name="requirements" placeholder="Requirement keywords (comma separated)" className="rounded-xl px-3 py-2 text-sm" />
        </div>

        <textarea required name="description" placeholder="Role summary, expected outcomes, onboarding notes" className="min-h-[110px] rounded-xl px-3 py-2 text-sm" />

        <div className="if-filter-grid md:grid-cols-2">
          <button name="status" value="DRAFT" className="if-btn if-btn-secondary w-full px-3 py-2.5 text-sm">Save as draft</button>
          <button name="status" value="PUBLISHED" className="if-btn if-btn-primary w-full px-3 py-2.5 text-sm">Publish opportunity</button>
        </div>
      </form>

      <div className="space-y-2">
        {opportunities.map((opportunity) => (
          <a
            key={opportunity.id}
            href={`/org/${params.orgSlug}/app/opportunities/${opportunity.id}`}
            className="if-panel-muted block rounded-2xl border border-brand-border/55 p-4 transition hover:border-brand-accent/35 hover:bg-brand-surface"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-brand-text">{opportunity.title}</p>
                <p className="mt-1 text-sm text-brand-textSoft">
                  {opportunity.description.slice(0, 120)}
                  {opportunity.description.length > 120 ? "..." : ""}
                </p>
              </div>
              <span className={statusTone(opportunity.status)}>{opportunity.status}</span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-brand-textSoft md:grid-cols-4">
              <p className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5 text-brand-muted" />{opportunity.type}</p>
              <p className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-brand-muted" />Applicants: {opportunity.applications.length}</p>
              <p className="inline-flex items-center gap-1"><CircleDot className="h-3.5 w-3.5 text-brand-muted" />Capacity: {opportunity.capacity}</p>
              <p className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-brand-muted" />Program: {opportunity.program?.name ?? "Unassigned"}</p>
            </div>
          </a>
        ))}
        {opportunities.length === 0 ? (
          <p className="if-empty-state text-sm">No opportunities created yet.</p>
        ) : null}
      </div>
    </div>
  );
}
