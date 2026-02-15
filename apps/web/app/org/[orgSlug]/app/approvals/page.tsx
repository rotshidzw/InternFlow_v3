import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantApprovalsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const [verification, pendingLogbookApprovals] = await Promise.all([
    prisma.organizationVerification.findFirst({ where: { orgId: access.membership.organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.logbookApproval.findMany({ where: { status: "PENDING", entry: { user: { memberships: { some: { organizationId: access.membership.organizationId } } } } }, include: { entry: { include: { user: true } } }, take: 50 })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Approvals & Governance</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-medium">Organization compliance status (HQ decision)</p>
        <p>Status: {verification?.status ?? "PENDING"}</p>
        <p>Reason: {verification?.reason ?? "n/a"}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-medium">Pending supervisor/coordinator approvals</p>
        {pendingLogbookApprovals.map((a) => <p key={a.id}>{a.entry.user.email} · week {a.entry.weekStart.toISOString().slice(0,10)}</p>)}
      </div>
    </div>
  );
}
