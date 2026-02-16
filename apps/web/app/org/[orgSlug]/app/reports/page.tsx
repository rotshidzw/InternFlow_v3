import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

const EXPORTS = [
  {
    title: "Learner register CSV",
    description: "All learner records with program placement context for operational reporting.",
    href: "learners.csv"
  },
  {
    title: "Stipend register CSV",
    description: "Monthly stipend payment tracking for paid vs outstanding learners.",
    href: "stipend.csv"
  },
  {
    title: "Compliance summary CSV",
    description: "Document verification and compliance status summary for governance checks.",
    href: "compliance.csv"
  }
];

export default async function ReportsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const [learners, enrollments, paidEnrollments, documents] = await Promise.all([
    prisma.membership.count({ where: { organizationId: orgId, role: "STUDENT" } }),
    prisma.enrollment.count({ where: { organizationId: orgId } }),
    prisma.enrollment.count({ where: { organizationId: orgId, stipendPaid: true } }),
    prisma.document.count({ where: { organizationId: orgId } })
  ]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Reports &amp; Exports</h1>
        <p className="text-sm text-slate-600">Download operational reports for learners, stipends, and compliance in one place.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Learners</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{learners}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Enrollments</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{enrollments}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Stipends paid</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{paidEnrollments}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Documents</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{documents}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Available exports</p>
        <p className="mt-1 text-xs text-slate-500">Use these files for audits, finance reconciliation, and external reporting.</p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {EXPORTS.map((item) => (
            <div key={item.href} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-600">{item.description}</p>
              <Link
                className="mt-3 inline-flex rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
                href={`/api/org/${params.orgSlug}/exports/${item.href}`}
              >
                Download CSV
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Compliance pack ZIP is planned next. For now, CSV exports are production-ready and can be generated on demand.
      </div>
    </div>
  );
}
