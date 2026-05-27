import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { BriefcaseBusiness, GraduationCap, UserRoundCheck } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";

function toneForStatus(status: string) {
  if (["PUBLISHED", "ACTIVE", "OPEN"].includes(status)) return "if-status if-status-success";
  if (["DRAFT", "PENDING", "SHORTLISTED"].includes(status)) return "if-status if-status-warning";
  if (["CLOSED", "REJECTED", "INACTIVE"].includes(status)) return "if-status if-status-rejected";
  return "if-status if-status-draft";
}

export default async function ProgramDetailPage({ params }: { params: { orgSlug: string; programId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);

  const program = await prisma.program.findFirst({
    where: { id: params.programId, organizationId: access.membership.organizationId },
    include: {
      opportunities: { orderBy: { id: "desc" } },
      enrollments: { include: { user: true }, orderBy: { id: "desc" } },
    },
  });

  if (!program) return <div className="if-empty-state">Program not found.</div>;

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="if-auth-title">{program.name}</h1>
            <p className="if-auth-subtitle">{program.description || "No programme description provided."}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="if-action-chip">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {program.opportunities.length} opportunities
            </span>
            <span className="if-action-chip">
              <UserRoundCheck className="h-3.5 w-3.5" />
              {program.enrollments.length} enrollments
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="if-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-text">
              <BriefcaseBusiness className="h-4 w-4 text-brand-accentStrong" />
              Opportunities
            </h2>
            <Link href={`/org/${params.orgSlug}/app/opportunities`} className="text-xs font-medium text-brand-accentStrong hover:text-brand-text">
              View all
            </Link>
          </div>

          <div className="space-y-2">
            {program.opportunities.length ? (
              program.opportunities.map((opportunity) => (
                <a
                  key={opportunity.id}
                  href={`/org/${params.orgSlug}/app/opportunities/${opportunity.id}`}
                  className="if-panel-muted flex items-center justify-between rounded-xl border border-brand-border/60 px-3 py-2.5 transition hover:border-brand-accent/40"
                >
                  <p className="max-w-[72%] truncate text-sm font-medium text-brand-textSoft">{opportunity.title}</p>
                  <span className={toneForStatus(opportunity.status)}>{opportunity.status}</span>
                </a>
              ))
            ) : (
              <p className="if-empty-state px-3 py-6 text-center text-sm">No opportunities for this programme yet.</p>
            )}
          </div>
        </section>

        <section className="if-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-text">
              <GraduationCap className="h-4 w-4 text-brand-accentStrong" />
              Enrollments
            </h2>
            <Link href={`/org/${params.orgSlug}/app/enrollments`} className="text-xs font-medium text-brand-accentStrong hover:text-brand-text">
              Open enrollments
            </Link>
          </div>

          <div className="space-y-2">
            {program.enrollments.length ? (
              program.enrollments.map((enrollment) => (
                <a
                  key={enrollment.id}
                  href={`/org/${params.orgSlug}/app/learners/${enrollment.userId}`}
                  className="if-panel-muted flex items-center justify-between rounded-xl border border-brand-border/60 px-3 py-2.5 transition hover:border-brand-accent/40"
                >
                  <p className="max-w-[72%] truncate text-sm font-medium text-brand-textSoft">{enrollment.user.email}</p>
                  <span className={toneForStatus(enrollment.status)}>{enrollment.status}</span>
                </a>
              ))
            ) : (
              <p className="if-empty-state px-3 py-6 text-center text-sm">No learners are enrolled in this programme yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
