import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { listTenantBoundLogbookEntryIds } from "@/lib/logbook-tenant-binding";

export default async function TenantApprovalsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const boundEntryIds = await listTenantBoundLogbookEntryIds(access.membership.organizationId);
  const [verification, pendingLogbookApprovals] = await Promise.all([
    prisma.organizationVerification.findFirst({
      where: { orgId: access.membership.organizationId },
      orderBy: { createdAt: "desc" },
    }),
    boundEntryIds.length
      ? prisma.logbookApproval.findMany({
          where: {
            status: "PENDING",
            entryId: { in: boundEntryIds },
          },
          include: { entry: { include: { user: true } } },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Governance</p>
        <h1 className="if-auth-title mt-2">Approvals and controls</h1>
        <p className="if-auth-subtitle">Track HQ compliance decision status and pending supervisor/coordinator approvals.</p>
      </section>

      <div className="if-panel rounded-xl p-3 text-sm">
        <p className="font-medium text-brand-text">Organization compliance status (HQ decision)</p>
        <p className="mt-1 text-brand-textSoft">Status: {verification?.status ?? "PENDING"}</p>
        <p className="text-brand-textSoft">Reason: {verification?.reason ?? "n/a"}</p>
      </div>

      <div className="if-panel rounded-xl p-3 text-sm">
        <p className="font-medium text-brand-text">Pending supervisor/coordinator approvals</p>
        <div className="mt-2 space-y-1 text-brand-textSoft">
          {pendingLogbookApprovals.map((approval) => (
            <p key={approval.id}>
              {approval.entry.user.email} - week {approval.entry.weekStart.toISOString().slice(0, 10)}
            </p>
          ))}
          {pendingLogbookApprovals.length === 0 ? (
            <p className="text-brand-muted">No pending logbook approvals.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
