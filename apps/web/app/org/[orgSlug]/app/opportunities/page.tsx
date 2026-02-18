import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { BriefcaseBusiness, CircleDot, FileText, Users } from "lucide-react";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { assertTenantAreaAccess } from "@/lib/tenant-rbac";

function statusTone(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "DRAFT") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default async function OpportunitiesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  assertTenantAreaAccess(params.orgSlug, access.membership.role, "opportunities");

  const [programs, opportunities] = await Promise.all([
    prisma.program.findMany({ where: { organizationId: access.membership.organizationId }, orderBy: { name: "asc" } }),
    prisma.opportunity.findMany({
      where: { organizationId: access.membership.organizationId },
      orderBy: { title: "asc" },
      include: { applications: true, program: true }
    })
  ]);

  const publishedCount = opportunities.filter((opportunity) => opportunity.status === "PUBLISHED").length;
  const draftCount = opportunities.filter((opportunity) => opportunity.status === "DRAFT").length;
  const applicantsCount = opportunities.reduce((sum, opportunity) => sum + opportunity.applications.length, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Opportunities</h1>
        <p className="mt-1 text-sm text-slate-600">Create, publish, and track hiring pipelines with one-click actions for your team.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Published: <span className="font-semibold">{publishedCount}</span></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Drafts: <span className="font-semibold">{draftCount}</span></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Applicants across all: <span className="font-semibold">{applicantsCount}</span></div>
        </div>
      </div>

      <form action={`/api/org/${params.orgSlug}/opportunities`} method="post" className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          <input required name="title" placeholder="Opportunity title" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:col-span-2" />
          <select name="type" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
            <option>INTERNSHIP</option>
            <option>LEARNERSHIP</option>
            <option>SKILLS_PROGRAM</option>
            <option>MENTORSHIP</option>
          </select>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <select name="programId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
            <option value="">No program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          <input name="capacity" type="number" min={1} defaultValue={50} placeholder="Capacity" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          <input name="requirements" placeholder="Requirement keywords (comma separated)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>

        <textarea required name="description" placeholder="Role summary, expected outcomes, onboarding notes" className="min-h-[110px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />

        <div className="grid gap-2 md:grid-cols-2">
          <button name="status" value="DRAFT" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100">Save as draft</button>
          <button name="status" value="PUBLISHED" className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">Publish opportunity</button>
        </div>
      </form>

      <div className="space-y-2">
        {opportunities.map((opportunity) => (
          <Link key={opportunity.id} href={`/org/${params.orgSlug}/app/opportunities/${opportunity.id}`} className="block rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-slate-900">{opportunity.title}</p>
                <p className="mt-1 text-sm text-slate-600">{opportunity.description.slice(0, 120)}{opportunity.description.length > 120 ? "…" : ""}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(opportunity.status)}`}>{opportunity.status}</span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-4">
              <p className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5 text-slate-500" />{opportunity.type}</p>
              <p className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-500" />Applicants: {opportunity.applications.length}</p>
              <p className="inline-flex items-center gap-1"><CircleDot className="h-3.5 w-3.5 text-slate-500" />Capacity: {opportunity.capacity}</p>
              <p className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-slate-500" />Program: {opportunity.program?.name ?? "Unassigned"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
