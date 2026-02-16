import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, Clock3, UserRound, XCircle } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";

function statusTone(status: string) {
  if (status === "ACCEPTED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "SHORTLISTED") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default async function ApplicantsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const applications = await prisma.application.findMany({
    where: { opportunity: { organizationId: access.membership.organizationId } },
    include: { user: true, opportunity: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const applied = applications.filter((application) => application.status === "APPLIED").length;
  const shortlisted = applications.filter((application) => application.status === "SHORTLISTED").length;
  const accepted = applications.filter((application) => application.status === "ACCEPTED").length;
  const rejected = applications.filter((application) => application.status === "REJECTED").length;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Applicants Pipeline</h1>
        <p className="mt-1 text-sm text-slate-600">Review applicants quickly, move candidates across stages, and open learner profiles in one click.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-slate-500" />
            Applied: <span className="font-semibold">{applied}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 inline-flex items-center gap-1">
            <BriefcaseBusiness className="h-3.5 w-3.5 text-amber-600" />
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
      </div>

      <div className="space-y-2">
        {applications.map((application) => (
          <div key={application.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-slate-900">{application.user.email}</p>
                <p className="mt-0.5 text-sm text-slate-600">{application.opportunity.title}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(application.status)}`}>{application.status}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <form action={`/api/applications/${application.id}/status`} method="post" className="flex gap-2">
                <input type="hidden" name="status" value="SHORTLISTED" />
                <button className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100">Shortlist</button>
              </form>

              <form action={`/api/applications/${application.id}/status`} method="post" className="flex gap-2">
                <input type="hidden" name="status" value="ACCEPTED" />
                <button className="rounded-xl border border-emerald-300 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50">Accept</button>
              </form>

              <form action={`/api/applications/${application.id}/status`} method="post" className="flex gap-2">
                <input type="hidden" name="status" value="REJECTED" />
                <button className="rounded-xl border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50">Reject</button>
              </form>

              <Link href={`/org/${params.orgSlug}/app/learners/${application.userId}`} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                <UserRound className="h-3.5 w-3.5" /> Learner profile
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
