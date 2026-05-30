import { prisma } from "@internflow/db/src";
import {
  parseAttendanceRegisterMetadata,
  type AttendanceRegisterMetadata,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE,
  TENANT_ROLE_GROUPS,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";
import { requireTenantAccess } from "@/lib/tenant-portal";

function labelRegisterType(value: AttendanceRegisterMetadata["registerType"] | null) {
  if (value === "INDUCTION") return "Induction";
  if (value === "MONTHLY_ATTENDANCE") return "Monthly attendance";
  return "Unspecified";
}

function statusClass(status: string) {
  if (status === "APPROVED") return "if-status if-status-success";
  if (status === "REJECTED") return "if-status if-status-error";
  return "if-status if-status-pending";
}

export default async function RegistersPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const access = await requireTenantAccess(params.orgSlug);
  const canSubmit = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.CHECKLIST_MANAGE,
  );
  const canApprove = isTenantRoleAllowed(access.membership.role, [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SUPERVISOR,
    TENANT_ROLE.SYSTEM_ADMIN,
  ]);
  const canDownload = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.EXPORT_READ,
  );

  const [programmes, enrollments, registers] = await Promise.all([
    prisma.program.findMany({
      where: { organizationId: access.membership.organizationId },
      orderBy: { startDate: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { organizationId: access.membership.organizationId },
      include: { user: true, program: true },
      orderBy: { id: "desc" },
      take: 300,
    }),
    prisma.organizationDocument.findMany({
      where: {
        orgId: access.membership.organizationId,
        category: "ATTENDANCE_REGISTER",
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const notice = searchParams?.notice === "register-submitted";
  const programmeById = new Map(programmes.map((programme) => [programme.id, programme]));
  const learnerById = new Map(enrollments.map((enrollment) => [enrollment.userId, enrollment.user]));

  const registerRows = registers.map((register) => {
    const metadata = parseAttendanceRegisterMetadata(register.notes);
    const programmeName = metadata?.programmeId
      ? programmeById.get(metadata.programmeId)?.name ?? "Unknown programme"
      : "General";
    const learner =
      metadata?.learnerUserId && learnerById.has(metadata.learnerUserId)
        ? learnerById.get(metadata.learnerUserId)
        : null;
    return {
      register,
      metadata,
      programmeName,
      learnerLabel: learner ? learner.name ?? learner.email : "Group register",
    };
  });

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const pendingCount = registerRows.filter((row) => row.register.status === "PENDING_REVIEW").length;
  const approvedCount = registerRows.filter((row) => row.register.status === "APPROVED").length;
  const rejectedCount = registerRows.filter((row) => row.register.status === "REJECTED").length;
  const inductionCount = registerRows.filter(
    (row) => row.metadata?.registerType === "INDUCTION",
  ).length;
  const monthlyCount = registerRows.filter(
    (row) => row.metadata?.registerType === "MONTHLY_ATTENDANCE",
  ).length;
  const submittedThisMonth = registerRows.filter(
    (row) => row.register.createdAt.toISOString().slice(0, 7) === currentMonth,
  ).length;

  const attentionQueue = registerRows
    .filter(
      (row) =>
        row.register.status === "PENDING_REVIEW" || row.register.status === "REJECTED",
    )
    .slice(0, 8);

  return (
    <div className="if-auth-page gap-4">
      <section className="if-auth-hero">
        <p className="if-marketing-eyebrow text-brand-accentStrong">Registers and Evidence</p>
        <h1 className="if-auth-title mt-2">Attendance and register operations</h1>
        <p className="if-auth-subtitle">
          Capture induction and monthly attendance evidence, then track sign-off and approval
          states in one operations queue.
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
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
          <p className="if-auth-metric-label">Induction registers</p>
          <p className="if-auth-metric-value">{inductionCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Monthly attendance</p>
          <p className="if-auth-metric-value">{monthlyCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Submitted this month</p>
          <p className="if-auth-metric-value">{submittedThisMonth}</p>
        </article>
      </section>

      {notice ? (
        <p className="if-status if-status-success">Register submitted for review.</p>
      ) : null}

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Attention queue</h2>
        <p className="if-panel-copy mt-1">
          Prioritize pending reviews and rejected submissions requiring correction.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {attentionQueue.length === 0 ? (
            <p className="if-empty-state text-sm">No attention items right now.</p>
          ) : (
            attentionQueue.map(({ register, metadata, programmeName, learnerLabel }) => (
              <article key={register.id} className="if-panel-muted rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="if-card-title">
                    {register.fileKey.split("/").pop()} | {programmeName}
                  </p>
                  <span className={statusClass(register.status)}>{register.status}</span>
                </div>
                <p className="if-caption-text mt-1">
                  {labelRegisterType(metadata?.registerType ?? null)} | Learner: {learnerLabel}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      {canSubmit ? (
        <section className="if-auth-form">
          <h2 className="if-panel-title">Submit register evidence</h2>
          <form
            action={`/api/org/${params.orgSlug}/registers`}
            method="post"
            encType="multipart/form-data"
            className="if-filter-grid mt-3 md:grid-cols-3"
          >
            <select name="registerType" className="rounded p-2 text-sm">
              <option value="INDUCTION">Induction register</option>
              <option value="MONTHLY_ATTENDANCE">Monthly attendance register</option>
            </select>
            <select name="programmeId" className="rounded p-2 text-sm">
              <option value="">General register</option>
              {programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.name}
                </option>
              ))}
            </select>
            <input
              name="month"
              placeholder="Month (YYYY-MM)"
              className="rounded p-2 text-sm"
            />
            <input
              name="attendanceDate"
              type="date"
              className="rounded p-2 text-sm"
            />
            <select name="learnerUserId" className="rounded p-2 text-sm">
              <option value="">Group register (all learners)</option>
              {enrollments.map((enrollment) => (
                <option key={enrollment.userId} value={enrollment.userId}>
                  {(enrollment.user.name ?? enrollment.user.email) + " - " + enrollment.program.name}
                </option>
              ))}
            </select>
            <input
              name="trainerSignoffBy"
              placeholder="Trainer/facilitator sign-off name"
              className="rounded p-2 text-sm"
            />
            <input
              name="notes"
              placeholder="Notes (optional)"
              className="rounded p-2 text-sm md:col-span-2"
            />
            <input
              type="file"
              name="file"
              required
              className="rounded p-2 text-sm md:col-span-3"
            />
            <button className="if-btn if-btn-primary px-4 py-2 text-sm md:col-span-3">
              Submit register
            </button>
          </form>
        </section>
      ) : (
        <p className="if-status if-status-warning">
          Your role is read-only for register submissions.
        </p>
      )}

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Register history</h2>
        <p className="if-panel-copy mt-1">
          Submission history, sign-off metadata, and approval evidence.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {registerRows.length === 0 ? (
            <p className="if-empty-state text-sm">No registers uploaded yet.</p>
          ) : (
            registerRows.map(({ register, metadata, programmeName, learnerLabel }) => (
              <article key={register.id} className="if-panel-muted rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="if-card-title">
                    {register.fileKey.split("/").pop()}
                  </p>
                  <span className={statusClass(register.status)}>{register.status}</span>
                </div>
                <p className="if-caption-text mt-1">
                  {register.createdAt.toISOString().slice(0, 10)} | {labelRegisterType(metadata?.registerType ?? null)} | Programme: {programmeName}
                </p>
                <p className="if-caption-text">
                  Learner: {learnerLabel} | Month: {metadata?.month ?? "n/a"}
                </p>
                <p className="if-caption-text">
                  Trainer sign-off: {metadata?.trainerSignoffBy ?? "not recorded"}
                </p>
                <p className="if-caption-text">
                  Coordinator approval:{" "}
                  {metadata?.coordinatorApprovalDecision
                    ? `${metadata.coordinatorApprovalDecision} by ${metadata.coordinatorApprovalBy ?? "unknown"}`
                    : "pending"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {canDownload ? (
                    <a
                      className="if-btn if-btn-secondary px-2 py-1 text-xs"
                      href={`/api/org/${params.orgSlug}/registers/${register.id}`}
                    >
                      Download
                    </a>
                  ) : null}
                  {canApprove && register.status === "PENDING_REVIEW" ? (
                    <>
                      <form action={`/api/org/${params.orgSlug}/registers/${register.id}`} method="post" className="flex items-center gap-2">
                        <input type="hidden" name="decision" value="APPROVE" />
                        <input
                          name="approvalNote"
                          placeholder="Approval note (optional)"
                          className="rounded px-2 py-1 text-xs"
                        />
                        <button className="if-btn if-btn-primary px-2 py-1 text-xs">
                          Approve
                        </button>
                      </form>
                      <form action={`/api/org/${params.orgSlug}/registers/${register.id}`} method="post" className="flex items-center gap-2">
                        <input type="hidden" name="decision" value="REJECT" />
                        <input
                          name="approvalNote"
                          placeholder="Rejection reason"
                          className="rounded px-2 py-1 text-xs"
                          required
                        />
                        <button className="if-btn if-btn-secondary px-2 py-1 text-xs">
                          Reject
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
