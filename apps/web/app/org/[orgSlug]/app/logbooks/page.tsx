import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { listTenantBoundLogbookEntryIds } from "@/lib/logbook-tenant-binding";
import {
  TENANT_ROLE_GROUPS,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function approvalStatusClass(status: string) {
  if (status === "APPROVED") return "if-status if-status-success";
  if (status === "REJECTED") return "if-status if-status-error";
  return "if-status if-status-pending";
}

export default async function LogbooksPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const canReview = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.APP_REVIEW,
  );
  const canInspect = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.EXPORT_READ,
  );

  if (!canReview && !canInspect) {
    return (
      <div className="if-panel rounded-2xl p-4 text-sm text-brand-textSoft">
        Your role does not have logbook access.
      </div>
    );
  }

  const boundEntryIds = await listTenantBoundLogbookEntryIds(access.membership.organizationId);
  const logs = boundEntryIds.length
    ? await prisma.logbookEntry.findMany({
        where: { id: { in: boundEntryIds } },
        include: {
          user: true,
          approvals: { orderBy: { createdAt: "desc" }, take: 5 },
        },
        orderBy: { createdAt: "desc" },
        take: 80,
      })
    : [];

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const rows = logs.map((entry) => {
    const latestStatus = entry.approvals[0]?.status ?? "PENDING";
    const requiresAttention = latestStatus !== "APPROVED" || !entry.evidenceKey;
    return {
      entry,
      latestStatus,
      requiresAttention,
    };
  });

  const pendingCount = rows.filter((row) => row.latestStatus === "PENDING").length;
  const approvedCount = rows.filter((row) => row.latestStatus === "APPROVED").length;
  const rejectedCount = rows.filter((row) => row.latestStatus === "REJECTED").length;
  const missingEvidenceCount = rows.filter((row) => !row.entry.evidenceKey).length;
  const submittedThisMonth = rows.filter(
    (row) => row.entry.createdAt.toISOString().slice(0, 7) === currentMonth,
  ).length;
  const attentionQueue = rows.filter((row) => row.requiresAttention).slice(0, 10);

  return (
    <div className="if-auth-page gap-4">
      <section className="if-auth-hero">
        <p className="if-marketing-eyebrow text-brand-accentStrong">Delivery Logbooks</p>
        <h1 className="if-auth-title mt-2">Weekly learner logbook oversight</h1>
        <p className="if-auth-subtitle">
          Review submissions, track approval states, and keep evidence-backed learning logs ready
          for delivery and audit checks.
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Entries tracked</p>
          <p className="if-auth-metric-value">{rows.length}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Pending review</p>
          <p className="if-auth-metric-value">{pendingCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Approved</p>
          <p className="if-auth-metric-value">{approvedCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Rejected</p>
          <p className="if-auth-metric-value">{rejectedCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Missing evidence</p>
          <p className="if-auth-metric-value">{missingEvidenceCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Submitted this month</p>
          <p className="if-auth-metric-value">{submittedThisMonth}</p>
        </article>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Attention queue</h2>
        <p className="if-panel-copy mt-1">
          Prioritize entries waiting review, rejected records, and submissions missing evidence
          files.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {attentionQueue.length === 0 ? (
            <p className="if-empty-state text-sm">No attention items right now.</p>
          ) : (
            attentionQueue.map((row) => (
              <article key={row.entry.id} className="if-panel-muted rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="if-card-title">
                    {row.entry.user.name ?? row.entry.user.email} | Week {isoDate(row.entry.weekStart)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className={approvalStatusClass(row.latestStatus)}>{row.latestStatus}</span>
                    {!row.entry.evidenceKey ? (
                      <span className="if-status if-status-warning">Evidence missing</span>
                    ) : (
                      <span className="if-status if-status-success">Evidence attached</span>
                    )}
                  </div>
                </div>
                <p className="if-caption-text mt-1">
                  Submitted {isoDate(row.entry.createdAt)} | Approvals logged: {row.entry.approvals.length}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Logbook history</h2>
        <p className="if-panel-copy mt-1">
          Review summaries, evidence presence, and approval timeline for each learner logbook
          entry.
        </p>

        <div className="mt-3 space-y-3">
          {rows.length === 0 ? (
            <p className="if-empty-state text-sm">No logbook entries found for this workspace.</p>
          ) : (
            rows.map((row) => (
              <article key={row.entry.id} className="if-panel-muted rounded-xl p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="if-card-title">
                    {row.entry.user.name ?? row.entry.user.email} | Week {isoDate(row.entry.weekStart)}
                  </p>
                  <span className={approvalStatusClass(row.latestStatus)}>{row.latestStatus}</span>
                </div>
                <p className="if-body-text mt-1">{row.entry.summary}</p>
                <p className="if-caption-text mt-1">
                  Submitted {isoDate(row.entry.createdAt)} | Evidence:{" "}
                  {row.entry.evidenceKey ? "Attached" : "Not attached"}
                </p>

                <div className="mt-2 grid gap-1">
                  {row.entry.approvals.length === 0 ? (
                    <p className="if-caption-text">No approvals yet.</p>
                  ) : (
                    row.entry.approvals.slice(0, 2).map((approval) => (
                      <p key={approval.id} className="if-caption-text">
                        {approval.status} on {isoDate(approval.createdAt)}
                        {approval.comment ? ` | ${approval.comment}` : ""}
                      </p>
                    ))
                  )}
                </div>

                {canReview ? (
                  <form
                    action={`/api/org/${params.orgSlug}/logbooks/${row.entry.id}/approval`}
                    method="post"
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    <select name="status" className="h-9 rounded px-2 text-xs">
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                    <input
                      name="comment"
                      placeholder="Comment"
                      className="h-9 min-w-[12rem] flex-1 rounded px-3 text-xs"
                    />
                    <button className="if-btn if-btn-primary h-9 px-3 text-xs">
                      Submit review
                    </button>
                  </form>
                ) : (
                  <p className="if-status if-status-draft mt-3">
                    Your role can inspect entries but cannot submit approvals.
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
