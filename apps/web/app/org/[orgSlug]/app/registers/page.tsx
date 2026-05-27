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

  const pendingCount = registerRows.filter((row) => row.register.status === "PENDING_REVIEW").length;
  const approvedCount = registerRows.filter((row) => row.register.status === "APPROVED").length;
  const rejectedCount = registerRows.filter((row) => row.register.status === "REJECTED").length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Attendance & Registers</h1>
        <p className="text-sm text-slate-600">
          Capture induction and monthly attendance evidence with sign-off and approval history.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Pending review: <span className="font-semibold">{pendingCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Approved: <span className="font-semibold">{approvedCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Rejected: <span className="font-semibold">{rejectedCount}</span>
        </div>
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Register submitted for review.
        </p>
      )}

      {canSubmit ? (
        <form
          action={`/api/org/${params.orgSlug}/registers`}
          method="post"
          encType="multipart/form-data"
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3"
        >
          <select name="registerType" className="rounded-lg border border-slate-300 p-2 text-sm">
            <option value="INDUCTION">Induction register</option>
            <option value="MONTHLY_ATTENDANCE">Monthly attendance register</option>
          </select>
          <select name="programmeId" className="rounded-lg border border-slate-300 p-2 text-sm">
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
            className="rounded-lg border border-slate-300 p-2 text-sm"
          />
          <input
            name="attendanceDate"
            type="date"
            className="rounded-lg border border-slate-300 p-2 text-sm"
          />
          <select name="learnerUserId" className="rounded-lg border border-slate-300 p-2 text-sm">
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
            className="rounded-lg border border-slate-300 p-2 text-sm"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="rounded-lg border border-slate-300 p-2 text-sm md:col-span-2"
          />
          <input
            type="file"
            name="file"
            required
            className="rounded-lg border border-slate-300 p-2 text-sm md:col-span-3"
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white md:col-span-3">
            Submit register
          </button>
        </form>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Your role is read-only for register submissions.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Uploaded registers</h2>
        <div className="mt-3 space-y-2 text-sm">
          {registerRows.length === 0 ? (
            <p className="text-slate-500">No registers uploaded yet.</p>
          ) : (
            registerRows.map(({ register, metadata, programmeName, learnerLabel }) => (
              <div key={register.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">
                    {register.fileKey.split("/").pop()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {register.createdAt.toISOString().slice(0, 10)} | {register.status}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {labelRegisterType(metadata?.registerType ?? null)} | Programme: {programmeName} | Learner: {learnerLabel}
                </p>
                <p className="text-xs text-slate-600">
                  Month: {metadata?.month ?? "n/a"} | Trainer sign-off:{" "}
                  {metadata?.trainerSignoffBy ?? "not recorded"}
                </p>
                <p className="text-xs text-slate-600">
                  Coordinator approval:{" "}
                  {metadata?.coordinatorApprovalDecision
                    ? `${metadata.coordinatorApprovalDecision} by ${metadata.coordinatorApprovalBy ?? "unknown"}`
                    : "pending"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {canDownload && (
                    <a
                      className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                      href={`/api/org/${params.orgSlug}/registers/${register.id}`}
                    >
                      Download
                    </a>
                  )}
                  {canApprove && register.status === "PENDING_REVIEW" && (
                    <>
                      <form action={`/api/org/${params.orgSlug}/registers/${register.id}`} method="post" className="flex items-center gap-2">
                        <input type="hidden" name="decision" value="APPROVE" />
                        <input
                          name="approvalNote"
                          placeholder="Approval note (optional)"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">
                          Approve
                        </button>
                      </form>
                      <form action={`/api/org/${params.orgSlug}/registers/${register.id}`} method="post" className="flex items-center gap-2">
                        <input type="hidden" name="decision" value="REJECT" />
                        <input
                          name="approvalNote"
                          placeholder="Rejection reason"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                          required
                        />
                        <button className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700">
                          Reject
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
