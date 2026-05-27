import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, Clock3, UserRound, XCircle } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";

function statusTone(status: string) {
  if (status === "ACCEPTED") return "if-status if-status-success";
  if (status === "REVIEW" || status === "APPLIED" || status === "SUBMITTED") return "if-status if-status-pending";
  if (status === "SHORTLISTED") return "if-status if-status-warning";
  if (status === "REJECTED") return "if-status if-status-rejected";
  return "if-status if-status-draft";
}

export default async function ApplicantsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const applications = await prisma.application.findMany({
    where: { opportunity: { organizationId: access.membership.organizationId } },
    include: { user: true, opportunity: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: access.membership.organizationId,
      userId: { in: applications.map((application) => application.userId) },
    },
    include: { program: true },
    orderBy: { id: "desc" },
  });

  const enrollmentByUserId = new Map<string, (typeof enrollments)[number]>();
  for (const enrollment of enrollments) {
    if (!enrollmentByUserId.has(enrollment.userId)) {
      enrollmentByUserId.set(enrollment.userId, enrollment);
    }
  }

  const submitted = applications.filter((application) => ["APPLIED", "SUBMITTED"].includes(application.status)).length;
  const underReview = applications.filter((application) => ["REVIEW", "SHORTLISTED"].includes(application.status)).length;
  const accepted = applications.filter((application) => application.status === "ACCEPTED").length;
  const rejected = applications.filter((application) => application.status === "REJECTED").length;

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Pipeline Operations</p>
        <h1 className="if-auth-title mt-2">Applicants pipeline</h1>
        <p className="if-auth-subtitle">
          Review applicants, move candidates through stages, and assign placement only after acceptance.
        </p>

        <div className="if-auth-metrics mt-3 md:grid-cols-4">
          <div className="if-auth-metric">
            <p className="if-auth-metric-label inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Submitted</p>
            <p className="if-auth-metric-value">{submitted}</p>
          </div>
          <div className="if-auth-metric">
            <p className="if-auth-metric-label inline-flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" /> Under review</p>
            <p className="if-auth-metric-value">{underReview}</p>
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
      </section>

      <div className="space-y-2">
        {applications.map((application) => {
          const placement = enrollmentByUserId.get(application.userId);
          return (
            <div key={application.id} className="if-panel rounded-2xl border border-brand-border/65 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-brand-text">{application.user.email}</p>
                  <p className="mt-0.5 text-sm text-brand-textSoft">{application.opportunity.title}</p>
                </div>
                <span className={statusTone(application.status)}>{application.status}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={`/api/applications/${application.id}/status`} method="post" className="flex flex-wrap gap-2">
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
                    className="rounded-xl px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="REVIEW">Under review</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <button className="if-btn if-btn-secondary px-2.5 py-1.5 text-xs">Update status</button>
                </form>

                <Link
                  href={`/org/${params.orgSlug}/app/learners/${application.userId}`}
                  className="if-btn if-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                >
                  <UserRound className="h-3.5 w-3.5" /> Learner profile
                </Link>
              </div>

              {application.status === "ACCEPTED" && (
                <div className="if-panel-muted mt-3 rounded-xl border border-brand-border/60 p-3 text-xs text-brand-textSoft">
                  {placement ? (
                    <p>
                      Placement status: <span className="font-semibold text-brand-text">{placement.status}</span>
                      {" - "}
                      Programme: <span className="font-semibold text-brand-text">{placement.program.name}</span>
                    </p>
                  ) : application.opportunity.programId ? (
                    <form action={`/api/applications/${application.id}/placement`} method="post" className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="programId" value={application.opportunity.programId} />
                      <button className="if-btn if-btn-primary px-2.5 py-1.5 text-xs">Assign placement</button>
                      <span>Acceptance does not assign placement automatically.</span>
                    </form>
                  ) : (
                    <p>Placement not assigned. Set a programme on this opportunity first.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {applications.length === 0 ? (
          <p className="if-empty-state text-sm">No applicants found.</p>
        ) : null}
      </div>
    </div>
  );
}

