import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { BriefcaseBusiness, GraduationCap, UserRoundCheck } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { assertTenantAreaAccess } from "@/lib/tenant-rbac";

function toneForStatus(status: string) {
  if (["PUBLISHED", "ACTIVE", "OPEN"].includes(status)) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (["DRAFT", "PENDING", "SHORTLISTED"].includes(status)) return "bg-amber-100 text-amber-700 border-amber-200";
  if (["CLOSED", "REJECTED", "INACTIVE"].includes(status)) return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default async function ProgramDetailPage({ params }: { params: { orgSlug: string; programId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  assertTenantAreaAccess(params.orgSlug, access.membership.role, "programs");

  const program = await prisma.program.findFirst({
    where: { id: params.programId, organizationId: access.membership.organizationId },
    include: {
      opportunities: { orderBy: { id: "desc" } },
      enrollments: { include: { user: true }, orderBy: { id: "desc" } }
    }
  });

  if (!program) return <div>Program not found.</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{program.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{program.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {program.opportunities.length} opportunities
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              <UserRoundCheck className="h-3.5 w-3.5" />
              {program.enrollments.length} enrollments
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BriefcaseBusiness className="h-4 w-4 text-blue-600" />
              Opportunities
            </h2>
            <Link href={`/org/${params.orgSlug}/app/opportunities`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          <div className="space-y-2">
            {program.opportunities.length ? (
              program.opportunities.map((o) => (
                <Link
                  key={o.id}
                  href={`/org/${params.orgSlug}/app/opportunities/${o.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <p className="max-w-[72%] truncate text-sm font-medium text-slate-800">{o.title}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${toneForStatus(o.status)}`}>{o.status}</span>
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No opportunities for this program yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              Enrollments
            </h2>
            <Link href={`/org/${params.orgSlug}/app/enrollments`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Open enrollments
            </Link>
          </div>

          <div className="space-y-2">
            {program.enrollments.length ? (
              program.enrollments.map((e) => (
                <Link
                  key={e.id}
                  href={`/org/${params.orgSlug}/app/learners/${e.userId}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <p className="max-w-[72%] truncate text-sm font-medium text-slate-800">{e.user.email}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${toneForStatus(e.status)}`}>{e.status}</span>
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No learners are enrolled in this program yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
