import { prisma } from "@internflow/db/src";
import {
  applyCertificateReleaseTransitionsWithAudit,
  CERTIFICATE_RELEASE_RULES,
  loadOrganizationCertificatePolicyRecords,
  loadOrganizationCertificateRecords,
  loadOrganizationFollowUpRecords,
  resolveCertificateReleaseRuleForProgram,
  type CertificateRecord,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";
import { requireTenantAccess } from "@/lib/tenant-portal";

function releaseRuleLabel(value: string) {
  if (value === "IMMEDIATE") return "Immediate";
  if (value === "AFTER_3_MONTHS") return "After 3 months";
  if (value === "AFTER_6_MONTHS") return "After 6 months";
  if (value === "AFTER_12_MONTHS") return "After 12 months";
  return value;
}

function isoDate(value: string | Date | null | undefined) {
  if (!value) return "n/a";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toISOString().slice(0, 10);
}

function latestCertificateByEnrollment(records: CertificateRecord[]) {
  const map = new Map<string, CertificateRecord>();
  for (const record of records) {
    if (!map.has(record.enrollmentId)) {
      map.set(record.enrollmentId, record);
    }
  }
  return map;
}

export default async function CertificatesPage({ params }: { params: { orgSlug: string } }) {
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
        Your role does not have certificate operations access.
      </div>
    );
  }

  if (canInspect || canManage) {
    await applyCertificateReleaseTransitionsWithAudit({
      organizationId: access.membership.organizationId,
      actorUserId: access.user.id,
    });
  }

  const [programmes, enrollments, policyRecords, certificateRecords, followUpRecords] =
    await Promise.all([
      prisma.program.findMany({
        where: { organizationId: access.membership.organizationId },
        orderBy: { startDate: "desc" },
      }),
      prisma.enrollment.findMany({
        where: { organizationId: access.membership.organizationId },
        include: { user: true, program: true },
        orderBy: { id: "desc" },
        take: 500,
      }),
      loadOrganizationCertificatePolicyRecords(access.membership.organizationId),
      loadOrganizationCertificateRecords(access.membership.organizationId),
      loadOrganizationFollowUpRecords(access.membership.organizationId),
    ]);

  const now = new Date();
  const completedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "COMPLETED",
  );
  const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));
  const followUpsByEnrollment = new Map<string, typeof followUpRecords>();
  for (const followUp of followUpRecords) {
    const current = followUpsByEnrollment.get(followUp.enrollmentId) ?? [];
    current.push(followUp);
    followUpsByEnrollment.set(followUp.enrollmentId, current);
  }

  const certificateByEnrollment = latestCertificateByEnrollment(certificateRecords);
  const queuePendingIssue = completedEnrollments.filter(
    (enrollment) => !certificateByEnrollment.has(enrollment.id),
  );
  const latestCertificates = Array.from(certificateByEnrollment.values());
  const queueWaitingRelease = latestCertificates
    .filter((record) => record.status === "ISSUED")
    .sort((a, b) => a.releaseAt.localeCompare(b.releaseAt));
  const queueReleased = latestCertificates
    .filter((record) => record.status === "RELEASED")
    .sort((a, b) => b.releaseAt.localeCompare(a.releaseAt));

  const dueFollowUps = followUpRecords.filter(
    (record) => record.status === "DUE" && new Date(record.dueDate) <= now,
  ).length;
  const missingOutcome = followUpRecords.filter(
    (record) => record.status === "COMPLETED" && !record.outcome,
  ).length;
  const defaultPolicy = policyRecords.find((record) => record.programId === null);
  const managerDefault = access.user.name ?? "Programme Manager";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Certificate Operations</h1>
        <p className="text-sm text-slate-600">
          Manage issuance, delayed release windows, and learner certificate readiness from
          persisted operational records.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Completed learners: <span className="font-semibold">{completedEnrollments.length}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Pending issue: <span className="font-semibold">{queuePendingIssue.length}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Waiting release: <span className="font-semibold">{queueWaitingRelease.length}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Released: <span className="font-semibold">{queueReleased.length}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Follow-ups due: <span className="font-semibold">{dueFollowUps}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Release policy</h2>
          <p className="text-xs text-slate-500">
            Missing outcomes on completed follow-ups: {missingOutcome}
          </p>
        </div>
        {canManage ? (
          <div className="mt-3 space-y-2">
            <form
              action={`/api/org/${params.orgSlug}/certificates/policy`}
              method="post"
              className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-3"
            >
              <input type="hidden" name="programId" value="" />
              <p className="text-sm font-medium text-slate-900">Default policy</p>
              <select
                name="releaseRule"
                defaultValue={defaultPolicy?.releaseRule ?? "IMMEDIATE"}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              >
                {CERTIFICATE_RELEASE_RULES.map((rule) => (
                  <option key={rule} value={rule}>
                    {releaseRuleLabel(rule)}
                  </option>
                ))}
              </select>
              <button className="rounded border border-emerald-300 px-2 py-1 text-sm text-emerald-700">
                Save default policy
              </button>
            </form>

            {programmes.map((programme) => {
              const override = policyRecords.find(
                (record) => record.programId === programme.id,
              );
              const effectiveRule = resolveCertificateReleaseRuleForProgram(
                programme.id,
                policyRecords,
              );
              return (
                <form
                  key={programme.id}
                  action={`/api/org/${params.orgSlug}/certificates/policy`}
                  method="post"
                  className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-4"
                >
                  <input type="hidden" name="programId" value={programme.id} />
                  <p className="text-sm text-slate-900">{programme.name}</p>
                  <select
                    name="releaseRule"
                    defaultValue={effectiveRule}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    {CERTIFICATE_RELEASE_RULES.map((rule) => (
                      <option key={rule} value={rule}>
                        {releaseRuleLabel(rule)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {override ? "Programme override set" : "Using default policy"}
                  </p>
                  <button className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700">
                    Save
                  </button>
                </form>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Your role can inspect policy outcomes but cannot change release rules.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Pending issue queue</h2>
        <p className="mt-1 text-sm text-slate-600">
          Learners completed the programme but still need certificate issuance.
        </p>
        <div className="mt-3 space-y-3 text-sm">
          {queuePendingIssue.length === 0 ? (
            <p className="text-slate-500">No learners waiting for issuance.</p>
          ) : (
            queuePendingIssue.map((enrollment) => {
              const learnerName = enrollment.user.name ?? enrollment.user.email;
              const releaseRule = resolveCertificateReleaseRuleForProgram(
                enrollment.programId,
                policyRecords,
              );
              const followUps = followUpsByEnrollment.get(enrollment.id) ?? [];
              const due = followUps.filter(
                (record) => record.status === "DUE" && new Date(record.dueDate) <= now,
              ).length;
              const previewHref = `/org/${params.orgSlug}/app/certificates/preview?tenant=${encodeURIComponent(access.membership.organization.name)}&enrollmentId=${enrollment.id}&learner=${encodeURIComponent(learnerName)}&programme=${encodeURIComponent(enrollment.program.name)}&manager=${encodeURIComponent(managerDefault)}&signature=${encodeURIComponent(managerDefault)}`;

              return (
                <div key={enrollment.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {learnerName} | {enrollment.program.name}
                  </p>
                  <p className="text-slate-600">
                    Completed status recorded | Release policy: {releaseRuleLabel(releaseRule)} |
                    Follow-up records: {followUps.length} (due now: {due})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={previewHref}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      View certificate
                    </a>
                  </div>
                  {canManage && (
                    <form
                      action={`/api/org/${params.orgSlug}/certificates/issue`}
                      method="post"
                      encType="multipart/form-data"
                      className="mt-2 grid gap-2 md:grid-cols-4"
                    >
                      <input type="hidden" name="enrollmentId" value={enrollment.id} />
                      <input
                        name="managerName"
                        defaultValue={managerDefault}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        name="signature"
                        defaultValue={managerDefault}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="hidden"
                        name="tenantName"
                        value={access.membership.organization.name}
                      />
                      <input
                        type="file"
                        name="signatureImage"
                        accept="image/*"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">
                        Issue certificate
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Delayed release queue</h2>
        <p className="mt-1 text-sm text-slate-600">
          Issued certificates waiting for their release date.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {queueWaitingRelease.length === 0 ? (
            <p className="text-slate-500">No certificates are waiting for delayed release.</p>
          ) : (
            queueWaitingRelease.map((record) => {
              const enrollment = enrollmentById.get(record.enrollmentId);
              const learnerName = enrollment?.user.name ?? enrollment?.user.email ?? record.userId;
              const programmeName = enrollment?.program.name ?? record.programId;
              return (
                <div key={record.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {learnerName} | {programmeName}
                  </p>
                  <p className="text-slate-600">
                    Certificate #{record.certificateNumber} | Issue: {record.issueDate} | Release:{" "}
                    {isoDate(record.releaseAt)} | Rule: {releaseRuleLabel(record.releaseRule)}
                  </p>
                  <p className="text-slate-600">
                    Current status: ISSUED
                  </p>
                  {canInspect && record.documentId && (
                    <a
                      href={`/api/org/${params.orgSlug}/certificates/${record.documentId}/download`}
                      className="mt-2 inline-block rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      Download issued copy
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Released certificates</h2>
          {canInspect && (
            <div className="flex flex-wrap gap-2 text-xs">
              <a
                className="rounded border border-slate-300 px-2 py-1 text-slate-700"
                href={`/api/org/${params.orgSlug}/certificates/issue`}
              >
                Export issued certificates (ZIP)
              </a>
              {programmes.map((programme) => (
                <a
                  key={programme.id}
                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700"
                  href={`/api/org/${params.orgSlug}/certificates/issue?programId=${programme.id}`}
                >
                  {programme.name} ZIP
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {queueReleased.length === 0 ? (
            <p className="text-slate-500">No released certificates yet.</p>
          ) : (
            queueReleased.map((record) => {
              const enrollment = enrollmentById.get(record.enrollmentId);
              const learnerName = enrollment?.user.name ?? enrollment?.user.email ?? record.userId;
              const programmeName = enrollment?.program.name ?? record.programId;
              const previewHref = `/org/${params.orgSlug}/app/certificates/preview?tenant=${encodeURIComponent(access.membership.organization.name)}&enrollmentId=${record.enrollmentId}&learner=${encodeURIComponent(learnerName)}&programme=${encodeURIComponent(programmeName)}&manager=${encodeURIComponent(managerDefault)}&signature=${encodeURIComponent(managerDefault)}`;
              return (
                <div key={record.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {learnerName} | {programmeName}
                  </p>
                  <p className="text-slate-600">
                    Certificate #{record.certificateNumber} | Issued {record.issueDate} | Released{" "}
                    {isoDate(record.releasedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={previewHref}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      View certificate
                    </a>
                    {record.documentId && (
                      <a
                        href={`/api/org/${params.orgSlug}/certificates/${record.documentId}/download`}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                      >
                        Download
                      </a>
                    )}
                    {canManage && (
                      <form
                        action={`/api/org/${params.orgSlug}/certificates/issue`}
                        method="post"
                        encType="multipart/form-data"
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="enrollmentId" value={record.enrollmentId} />
                        <input type="hidden" name="managerName" value={managerDefault} />
                        <input type="hidden" name="signature" value={managerDefault} />
                        <input
                          type="hidden"
                          name="tenantName"
                          value={access.membership.organization.name}
                        />
                        <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">
                          Reissue
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="text-slate-700">
          Need follow-up/outcome operations? Use{" "}
          <a
            href={`/org/${params.orgSlug}/app/follow-ups`}
            className="font-medium text-blue-700"
          >
            Follow-Ups
          </a>{" "}
          to capture 3/6/12-month outcomes and evidence.
        </p>
      </div>
    </div>
  );
}
