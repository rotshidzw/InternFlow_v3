import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantDashboardPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const [programs, opportunities, applications, enrollments, docsPending, approvalsPending] = await Promise.all([
    prisma.program.count({ where: { organizationId: orgId } }),
    prisma.opportunity.count({ where: { organizationId: orgId } }),
    prisma.application.count({ where: { opportunity: { organizationId: orgId } } }),
    prisma.enrollment.count({ where: { organizationId: orgId } }),
    prisma.document.count({ where: { organizationId: orgId, status: { in: ["SCAN_PENDING", "SCAN_FAILED"] } } }),
    prisma.logbookApproval.count({ where: { status: "PENDING", entry: { user: { memberships: { some: { organizationId: orgId } } } } } })
  ]);

  const cards = [
    ["Programs", programs, "programs"],
    ["Opportunities", opportunities, "opportunities"],
    ["Applicants", applications, "applicants"],
    ["Enrollments", enrollments, "enrollments"],
    ["Docs needing attention", docsPending, "documents"],
    ["Pending logbook approvals", approvalsPending, "approvals"]
  ] as const;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">Tenant Home</h1>
        <p className="text-sm text-slate-600">Welcome to your InternFlow body portal. Manage recruitment, compliance, and learner operations from one place.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={`/org/${params.orgSlug}/app/${href}`} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm hover:bg-white">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
