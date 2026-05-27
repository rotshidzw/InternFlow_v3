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
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
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

  const dueNow = followUpRecords.filter(
    (record) => record.status === "DUE" && new Date(record.dueDate) <= now,
  ).length;
  const completedCount = followUpRecords.filter((record) => record.status === "COMPLETED").length;
  const missingOutcome = followUpRecords.filter(
    (record) => record.status === "COMPLETED" && !record.outcome,
  ).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Post-Training Follow-Ups</h1>
        <p className="text-sm text-slate-600">
          Track 3/6/12-month follow-ups, capture outcomes, and attach evidence/notes.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Due now: <span className="font-semibold">{dueNow}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Completed: <span className="font-semibold">{completedCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Missing outcomes: <span className="font-semibold">{missingOutcome}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Follow-up register</h2>
        <div className="mt-3 space-y-2 text-sm">
          {followUpRecords.length === 0 ? (
            <p className="text-slate-500">No follow-up records scheduled yet.</p>
          ) : (
            followUpRecords.map((record) => {
              const enrollment = enrollmentById.get(record.enrollmentId);
              const learnerName = enrollment
                ? enrollment.user.name ?? enrollment.user.email
                : record.userId;
              const programme = enrollment?.program.name ?? record.programId;
              const dueDate = new Date(record.dueDate);
              const overdue = record.status === "DUE" && dueDate <= now;

              return (
                <div key={record.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {learnerName} | {programme} | {record.dueMonth} month follow-up
                  </p>
                  <p className="text-slate-600">
                    Due: {dueDate.toISOString().slice(0, 10)} | Status: {record.status}
                    {overdue ? " (overdue)" : ""}
                  </p>
                  <p className="text-slate-600">
                    Outcome: {record.outcome ? outcomeLabel(record.outcome) : "Not recorded"} | Evidence files:{" "}
                    {record.evidenceDocumentIds.length}
                  </p>
                  <p className="text-slate-600">Notes: {record.outcomeNotes ?? "None"}</p>
                  {canInspect && record.evidenceDocumentIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {record.evidenceDocumentIds.map((documentId, index) => (
                        <a
                          key={documentId}
                          href={`/api/org/${params.orgSlug}/documents/${documentId}/download`}
                          className="rounded border border-slate-300 px-2 py-1 text-slate-700"
                        >
                          Evidence {index + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  {canManage && (
                    <form
                      action={`/api/org/${params.orgSlug}/follow-ups`}
                      method="post"
                      encType="multipart/form-data"
                      className="mt-2 grid gap-2 md:grid-cols-3"
                    >
                      <input type="hidden" name="recordId" value={record.id} />
                      <select
                        name="status"
                        defaultValue={record.status}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {FOLLOW_UP_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <select
                        name="outcome"
                        defaultValue={record.outcome ?? ""}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
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
                        defaultValue={record.outcomeNotes ?? ""}
                        placeholder="Outcome notes"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        name="evidenceFile"
                        type="file"
                        className="rounded border border-slate-300 px-2 py-1 text-xs md:col-span-2"
                      />
                      <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">
                        Save follow-up
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
