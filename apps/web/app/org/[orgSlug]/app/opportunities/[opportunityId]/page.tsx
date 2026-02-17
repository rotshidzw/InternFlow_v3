import { prisma } from "@internflow/db/src";
import { BriefcaseBusiness, CheckCircle2, Clock3, Users, XCircle } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { assertTenantAreaAccess } from "@/lib/tenant-rbac";

function statusTone(status: string) {
  if (status === "ACCEPTED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "SHORTLISTED") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default async function OpportunityDetailPage({ params }: { params: { orgSlug: string; opportunityId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  assertTenantAreaAccess(params.orgSlug, access.membership.role, "opportunities");
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: params.opportunityId, organizationId: access.membership.organizationId },
    include: { applications: { include: { user: true }, orderBy: { createdAt: "desc" } }, program: true }
  });

  if (!opportunity) return <div>Opportunity not found.</div>;

  const totalApplicants = opportunity.applications.length;
  const shortlisted = opportunity.applications.filter((application) => application.status === "SHORTLISTED").length;
  const accepted = opportunity.applications.filter((application) => application.status === "ACCEPTED").length;
  const rejected = opportunity.applications.filter((application) => application.status === "REJECTED").length;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{opportunity.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{opportunity.description}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(opportunity.status)}`}>{opportunity.status}</span>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            Applicants: <span className="font-semibold">{totalApplicants}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-amber-600" />
            Shortlisted: <span className="font-semibold">{shortlisted}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Accepted: <span className="font-semibold">{accepted}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 inline-flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            Rejected: <span className="font-semibold">{rejected}</span>
          </div>
        </div>

        <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          {opportunity.type} · Program: {opportunity.program?.name ?? "Unassigned"}
        </p>
      </div>

      <section className="space-y-2">
        {opportunity.applications.map((application) => (
          <div key={application.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-lg font-semibold text-slate-900">{application.user.email}</p>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(application.status)}`}>{application.status}</span>
            </div>

            <form action={`/api/applications/${application.id}/status`} method="post" className="mt-3 grid gap-2 md:grid-cols-[220px_auto]">
              <select
                name="status"
                defaultValue={application.status === "SHORTLISTED" || application.status === "ACCEPTED" || application.status === "REJECTED" ? application.status : "SHORTLISTED"}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="SHORTLISTED">SHORTLISTED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <button className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800">Update candidate status</button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
