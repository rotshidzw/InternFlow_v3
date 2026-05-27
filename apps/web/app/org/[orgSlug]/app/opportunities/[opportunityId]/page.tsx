import { prisma } from "@internflow/db/src";
import { BriefcaseBusiness, CheckCircle2, Clock3, Users, XCircle } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";

function statusTone(status: string) {
  if (status === "ACCEPTED") return "if-status if-status-success";
  if (status === "REVIEW" || status === "APPLIED" || status === "SUBMITTED") return "if-status if-status-pending";
  if (status === "SHORTLISTED") return "if-status if-status-warning";
  if (status === "REJECTED") return "if-status if-status-rejected";
  return "if-status if-status-draft";
}

export default async function OpportunityDetailPage({ params }: { params: { orgSlug: string; opportunityId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: params.opportunityId, organizationId: access.membership.organizationId },
    include: { applications: { include: { user: true }, orderBy: { createdAt: "desc" } }, program: true },
  });

  if (!opportunity) return <div className="if-empty-state">Opportunity not found.</div>;

  const totalApplicants = opportunity.applications.length;
  const shortlisted = opportunity.applications.filter((application) => application.status === "SHORTLISTED").length;
  const accepted = opportunity.applications.filter((application) => application.status === "ACCEPTED").length;
  const rejected = opportunity.applications.filter((application) => application.status === "REJECTED").length;

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="if-auth-title">{opportunity.title}</h1>
            <p className="if-auth-subtitle">{opportunity.description}</p>
          </div>
          <span className={statusTone(opportunity.status)}>{opportunity.status}</span>
        </div>

        <div className="if-auth-metrics mt-3 md:grid-cols-4">
          <div className="if-auth-metric">
            <p className="if-auth-metric-label inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Applicants</p>
            <p className="if-auth-metric-value">{totalApplicants}</p>
          </div>
          <div className="if-auth-metric">
            <p className="if-auth-metric-label inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Shortlisted</p>
            <p className="if-auth-metric-value">{shortlisted}</p>
          </div>
          <div className="if-auth-metric">
            <p className="if-auth-metric-label inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Accepted</p>
            <p className="if-auth-metric-value">{accepted}</p>
          </div>
          <div className="if-auth-metric">
            <p className="if-auth-metric-label inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Rejected</p>
            <p className="if-auth-metric-value">{rejected}</p>
          </div>
        </div>

        <p className="if-action-chip mt-3">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          {opportunity.type} - Program: {opportunity.program?.name ?? "Unassigned"}
        </p>
      </section>

      <section className="space-y-2">
        {opportunity.applications.map((application) => (
          <div key={application.id} className="if-panel rounded-2xl border border-brand-border/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-lg font-semibold text-brand-text">{application.user.email}</p>
              <span className={statusTone(application.status)}>{application.status}</span>
            </div>

            <form action={`/api/applications/${application.id}/status`} method="post" className="if-filter-grid mt-3 md:grid-cols-[220px_auto]">
              <select
                name="status"
                defaultValue={
                  application.status === "REVIEW" ||
                  application.status === "SHORTLISTED" ||
                  application.status === "ACCEPTED" ||
                  application.status === "REJECTED"
                    ? application.status
                    : "REVIEW"
                }
                className="rounded-xl px-3 py-2 text-sm"
              >
                <option value="REVIEW">REVIEW</option>
                <option value="SHORTLISTED">SHORTLISTED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <button className="if-btn if-btn-primary px-3 py-2 text-sm font-medium">Update candidate status</button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
