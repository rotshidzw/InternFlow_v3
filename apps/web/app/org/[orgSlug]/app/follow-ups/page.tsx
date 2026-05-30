import { prisma } from "@internflow/db/src";
import {
  FOLLOW_UP_OUTCOMES,
  FOLLOW_UP_STATUSES,
  ensureFollowUpSchedulesForCompletedEnrollment,
  loadOrganizationFollowUpRecords,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";
import { requireTenantAccess } from "@/lib/tenant-portal";

function outcomeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toIsoDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "n/a" : date.toISOString().slice(0, 10);
}

function followUpStatusClass(status: string, overdue: boolean) {
  if (status === "COMPLETED") return "if-status if-status-success";
  if (status === "SKIPPED") return "if-status if-status-draft";
  if (overdue) return "if-status if-status-warning";
  return "if-status if-status-pending";
}

function followUpStatusLabel(status: string, overdue: boolean) {
  if (status === "COMPLETED") return "Completed";
  if (status === "SKIPPED") return "Skipped";
  if (overdue) return "Overdue";
  return "Due";
}

type FollowUpRow = {
  id: string;
  enrollmentId: string;
  userId: string;
  dueMonth: number;
  dueDate: string;
  status: string;
  outcome: string | null;
  outcomeNotes: string | null;
  evidenceDocumentIds: string[];
  learnerName: string;
  programmeName: string;
  overdue: boolean;
  dueSoon: boolean;
};

export default async function FollowUpsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const canManage = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.APP_REVIEW,
  );
  const canInspect = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.EXPORT_READ,
  );
  if (!canInspect && !canManage) {
    return (
      <div className="if-panel rounded-2xl p-4 text-sm text-brand-textSoft">
        Your role does not have follow-up tracking access.
      </div>
    );
  }

  const completedEnrollments = await prisma.enrollment.findMany({
    where: { organizationId: access.membership.organizationId, status: "COMPLETED" },
    include: { user: true, program: true },
    orderBy: { id: "desc" },
    take: 400,
  });

  for (const enrollment of completedEnrollments) {
    await ensureFollowUpSchedulesForCompletedEnrollment({
      organizationId: access.membership.organizationId,
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      programId: enrollment.programId,
      actorUserId: access.user.id,
    });
  }

  const followUpRecords = await loadOrganizationFollowUpRecords(
    access.membership.organizationId,
  );
  const enrollmentById = new Map(completedEnrollments.map((enrollment) => [enrollment.id, enrollment]));
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const rows: FollowUpRow[] = followUpRecords.map((record) => {
    const enrollment = enrollmentById.get(record.enrollmentId);
    const learnerName = enrollment
      ? enrollment.user.name ?? enrollment.user.email
      : record.userId;
    const programmeName = enrollment?.program.name ?? record.programId;
    const dueDate = new Date(record.dueDate);
    const overdue = record.status === "DUE" && dueDate <= now;
    const dueSoon = record.status === "DUE" && dueDate > now && dueDate <= in30Days;
    return {
      ...record,
      learnerName,
      programmeName,
      overdue,
      dueSoon,
    };
  });

  const dueNow = rows.filter((row) => row.overdue).length;
  const dueSoon = rows.filter((row) => row.dueSoon).length;
  const completedCount = rows.filter((row) => row.status === "COMPLETED").length;
  const skippedCount = rows.filter((row) => row.status === "SKIPPED").length;
  const missingOutcome = rows.filter(
    (row) => row.status === "COMPLETED" && !row.outcome,
  ).length;
  const noActionRequired = rows.filter(
    (row) =>
      row.status === "COMPLETED" &&
      Boolean(row.outcome) &&
      row.evidenceDocumentIds.length > 0,
  ).length;
  const completionRate = rows.length
    ? Math.round((completedCount / rows.length) * 100)
    : 0;
  const attentionQueue = rows
    .filter((row) => row.overdue || row.dueSoon || (row.status === "COMPLETED" && !row.outcome))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 10);

  return (
    <div className="if-auth-page gap-4">
      <section className="if-auth-hero">
        <p className="if-marketing-eyebrow text-brand-accentStrong">Outcomes Workspace</p>
        <h1 className="if-auth-title mt-2">Post-training follow-ups</h1>
        <p className="if-auth-subtitle">
          Track 3/6/12-month follow-ups, monitor overdue outcomes, and keep evidence attached
          for audit-ready impact reporting.
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Total schedules</p>
          <p className="if-auth-metric-value">{rows.length}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Overdue now</p>
          <p className="if-auth-metric-value">{dueNow}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Due in 30 days</p>
          <p className="if-auth-metric-value">{dueSoon}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Completed</p>
          <p className="if-auth-metric-value">{completedCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Outcome gaps</p>
          <p className="if-auth-metric-value">{missingOutcome}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">No action required</p>
          <p className="if-auth-metric-value">{noActionRequired}</p>
        </article>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="if-panel-title">Attention queue</h2>
            <p className="if-panel-copy mt-1">
              Prioritize overdue items, upcoming due checkpoints, and completed records missing
              outcomes.
            </p>
          </div>
          <span className="if-status if-status-pending">
            Completion rate: {completionRate}% | Skipped: {skippedCount}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {attentionQueue.length === 0 ? (
            <p className="if-empty-state text-sm">No urgent follow-up actions right now.</p>
          ) : (
            attentionQueue.map((row) => (
              <article key={row.id} className="if-panel-muted rounded-xl px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="if-card-title">
                    {row.learnerName} | {row.programmeName} | {row.dueMonth}-month follow-up
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={followUpStatusClass(row.status, row.overdue)}>
                      {followUpStatusLabel(row.status, row.overdue)}
                    </span>
                    {row.status === "COMPLETED" && !row.outcome ? (
                      <span className="if-status if-status-warning">Outcome missing</span>
                    ) : null}
                  </div>
                </div>
                <p className="if-caption-text mt-1">
                  Due {toIsoDate(row.dueDate)} | Evidence files: {row.evidenceDocumentIds.length}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Follow-up register</h2>
        <p className="if-panel-copy mt-1">
          Full schedule with status transitions, outcomes, and evidence updates.
        </p>
        <div className="mt-3 space-y-3 text-sm">
          {rows.length === 0 ? (
            <p className="if-empty-state text-sm">No follow-up records scheduled yet.</p>
          ) : (
            rows.map((row) => (
              <article key={row.id} className="if-panel-muted rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="if-card-title">
                    {row.learnerName} | {row.programmeName} | {row.dueMonth}-month follow-up
                  </p>
                  <span className={followUpStatusClass(row.status, row.overdue)}>
                    {followUpStatusLabel(row.status, row.overdue)}
                  </span>
                </div>
                <p className="if-caption-text mt-1">
                  Due {toIsoDate(row.dueDate)} | Outcome:{" "}
                  {row.outcome ? outcomeLabel(row.outcome) : "Not recorded"} | Evidence files:{" "}
                  {row.evidenceDocumentIds.length}
                </p>
                <p className="if-body-text mt-1">Notes: {row.outcomeNotes ?? "None"}</p>
                {canInspect && row.evidenceDocumentIds.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {row.evidenceDocumentIds.map((documentId, index) => (
                      <a
                        key={documentId}
                        href={`/api/org/${params.orgSlug}/documents/${documentId}/download`}
                        className="if-btn if-btn-secondary px-2 py-1 text-xs"
                      >
                        Evidence {index + 1}
                      </a>
                    ))}
                  </div>
                ) : null}

                {canManage ? (
                  <form
                    action={`/api/org/${params.orgSlug}/follow-ups`}
                    method="post"
                    encType="multipart/form-data"
                    className="mt-3 grid gap-2 md:grid-cols-3"
                  >
                    <input type="hidden" name="recordId" value={row.id} />
                    <select
                      name="status"
                      defaultValue={row.status}
                      className="rounded px-2 py-1 text-xs"
                    >
                      {FOLLOW_UP_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      name="outcome"
                      defaultValue={row.outcome ?? ""}
                      className="rounded px-2 py-1 text-xs"
                    >
                      <option value="">No outcome yet</option>
                      {FOLLOW_UP_OUTCOMES.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {outcomeLabel(outcome)}
                        </option>
                      ))}
                    </select>
                    <input
                      name="outcomeNotes"
                      defaultValue={row.outcomeNotes ?? ""}
                      placeholder="Outcome notes"
                      className="rounded px-2 py-1 text-xs"
                    />
                    <input
                      name="evidenceFile"
                      type="file"
                      className="rounded px-2 py-1 text-xs md:col-span-2"
                    />
                    <button className="if-btn if-btn-primary px-2 py-1 text-xs">
                      Save follow-up
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
