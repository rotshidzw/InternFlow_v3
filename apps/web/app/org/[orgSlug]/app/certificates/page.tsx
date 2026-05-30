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

function certificateStatusClass(status: string) {
  if (status === "RELEASED") return "if-status if-status-success";
  if (status === "ISSUED") return "if-status if-status-pending";
  if (status === "REVOKED") return "if-status if-status-error";
  return "if-status if-status-draft";
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
      <div className="if-panel rounded-2xl p-4 text-sm text-brand-textSoft">
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
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

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
  const releasingSoon = queueWaitingRelease.filter((record) => {
    const releaseDate = new Date(record.releaseAt);
    return releaseDate > now && releaseDate <= in30Days;
  }).length;

  const blockedByFollowUps = queuePendingIssue.filter((enrollment) => {
    const followUps = followUpsByEnrollment.get(enrollment.id) ?? [];
    return followUps.some(
      (record) => record.status === "DUE" && new Date(record.dueDate) <= now,
    );
  }).length;

  return (
    <div className="if-auth-page gap-4">
      <section className="if-auth-hero">
        <p className="if-marketing-eyebrow text-brand-accentStrong">Certificate Operations</p>
        <h1 className="if-auth-title mt-2">Issuance and release control</h1>
        <p className="if-auth-subtitle">
          Manage issuance, delayed release windows, and follow-up linked outcomes from one
          operational queue.
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Completed learners</p>
          <p className="if-auth-metric-value">{completedEnrollments.length}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Pending issue</p>
          <p className="if-auth-metric-value">{queuePendingIssue.length}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Blocked by follow-up</p>
          <p className="if-auth-metric-value">{blockedByFollowUps}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Waiting release</p>
          <p className="if-auth-metric-value">{queueWaitingRelease.length}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Releasing in 30d</p>
          <p className="if-auth-metric-value">{releasingSoon}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Released</p>
          <p className="if-auth-metric-value">{queueReleased.length}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Outcome gaps</p>
          <p className="if-auth-metric-value">{missingOutcome}</p>
        </article>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="if-panel-title">Release policy</h2>
          <p className="if-caption-text">
            Follow-ups due now: {dueFollowUps} | Missing outcomes: {missingOutcome}
          </p>
        </div>
        {canManage ? (
          <div className="mt-3 space-y-2">
            <form
              action={`/api/org/${params.orgSlug}/certificates/policy`}
              method="post"
              className="if-panel-muted grid gap-2 rounded-xl p-3 md:grid-cols-3"
            >
              <input type="hidden" name="programId" value="" />
              <p className="if-card-title">Default policy</p>
              <select
                name="releaseRule"
                defaultValue={defaultPolicy?.releaseRule ?? "IMMEDIATE"}
                className="rounded px-2 py-1 text-sm"
              >
                {CERTIFICATE_RELEASE_RULES.map((rule) => (
                  <option key={rule} value={rule}>
                    {releaseRuleLabel(rule)}
                  </option>
                ))}
              </select>
              <button className="if-btn if-btn-primary px-2 py-1 text-sm">
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
                  className="if-panel-muted grid gap-2 rounded-xl p-3 md:grid-cols-4"
                >
                  <input type="hidden" name="programId" value={programme.id} />
                  <p className="if-body-text">{programme.name}</p>
                  <select
                    name="releaseRule"
                    defaultValue={effectiveRule}
                    className="rounded px-2 py-1 text-sm"
                  >
                    {CERTIFICATE_RELEASE_RULES.map((rule) => (
                      <option key={rule} value={rule}>
                        {releaseRuleLabel(rule)}
                      </option>
                    ))}
                  </select>
                  <p className="if-caption-text">
                    {override ? "Programme override set" : "Using default policy"}
                  </p>
                  <button className="if-btn if-btn-secondary px-2 py-1 text-sm">
                    Save
                  </button>
                </form>
              );
            })}
          </div>
        ) : (
          <p className="if-status if-status-warning mt-3">
            Your role can inspect policy outcomes but cannot change release rules.
          </p>
        )}
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Pending issue queue</h2>
        <p className="if-panel-copy mt-1">
          Learners completed the programme but still need certificate issuance.
        </p>
        <div className="mt-3 space-y-3 text-sm">
          {queuePendingIssue.length === 0 ? (
            <p className="if-empty-state text-sm">No learners waiting for issuance.</p>
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
                <article key={enrollment.id} className="if-panel-muted rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="if-card-title">
                      {learnerName} | {enrollment.program.name}
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="if-status if-status-pending">
                        {releaseRuleLabel(releaseRule)}
                      </span>
                      {due > 0 ? (
                        <span className="if-status if-status-warning">Follow-ups due: {due}</span>
                      ) : (
                        <span className="if-status if-status-success">Follow-ups clear</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={previewHref}
                      className="if-btn if-btn-secondary px-2 py-1 text-xs"
                    >
                      View certificate
                    </a>
                  </div>
                  {canManage ? (
                    <form
                      action={`/api/org/${params.orgSlug}/certificates/issue`}
                      method="post"
                      encType="multipart/form-data"
                      className="mt-3 grid gap-2 md:grid-cols-4"
                    >
                      <input type="hidden" name="enrollmentId" value={enrollment.id} />
                      <input
                        name="managerName"
                        defaultValue={managerDefault}
                        className="rounded px-2 py-1 text-xs"
                      />
                      <input
                        name="signature"
                        defaultValue={managerDefault}
                        className="rounded px-2 py-1 text-xs"
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
                        className="rounded px-2 py-1 text-xs"
                      />
                      <button className="if-btn if-btn-primary px-2 py-1 text-xs">
                        Issue certificate
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Delayed release queue</h2>
        <p className="if-panel-copy mt-1">
          Issued certificates waiting for policy release windows.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {queueWaitingRelease.length === 0 ? (
            <p className="if-empty-state text-sm">
              No certificates are waiting for delayed release.
            </p>
          ) : (
            queueWaitingRelease.map((record) => {
              const enrollment = enrollmentById.get(record.enrollmentId);
              const learnerName = enrollment?.user.name ?? enrollment?.user.email ?? record.userId;
              const programmeName = enrollment?.program.name ?? record.programId;
              return (
                <article key={record.id} className="if-panel-muted rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="if-card-title">
                      {learnerName} | {programmeName}
                    </p>
                    <span className={certificateStatusClass(record.status)}>{record.status}</span>
                  </div>
                  <p className="if-caption-text mt-1">
                    Certificate #{record.certificateNumber} | Issue: {record.issueDate} | Release:{" "}
                    {isoDate(record.releaseAt)}
                  </p>
                  {canInspect && record.documentId ? (
                    <a
                      href={`/api/org/${params.orgSlug}/certificates/${record.documentId}/download`}
                      className="if-btn if-btn-secondary mt-2 px-2 py-1 text-xs"
                    >
                      Download issued copy
                    </a>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="if-panel-title">Released certificates</h2>
          {canInspect ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <a
                className="if-btn if-btn-secondary px-2 py-1 text-xs"
                href={`/api/org/${params.orgSlug}/certificates/issue`}
              >
                Export issued certificates (ZIP)
              </a>
              {programmes.map((programme) => (
                <a
                  key={programme.id}
                  className="if-btn if-btn-primary px-2 py-1 text-xs"
                  href={`/api/org/${params.orgSlug}/certificates/issue?programId=${programme.id}`}
                >
                  {programme.name} ZIP
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {queueReleased.length === 0 ? (
            <p className="if-empty-state text-sm">No released certificates yet.</p>
          ) : (
            queueReleased.map((record) => {
              const enrollment = enrollmentById.get(record.enrollmentId);
              const learnerName = enrollment?.user.name ?? enrollment?.user.email ?? record.userId;
              const programmeName = enrollment?.program.name ?? record.programId;
              const previewHref = `/org/${params.orgSlug}/app/certificates/preview?tenant=${encodeURIComponent(access.membership.organization.name)}&enrollmentId=${record.enrollmentId}&learner=${encodeURIComponent(learnerName)}&programme=${encodeURIComponent(programmeName)}&manager=${encodeURIComponent(managerDefault)}&signature=${encodeURIComponent(managerDefault)}`;
              return (
                <article key={record.id} className="if-panel-muted rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="if-card-title">
                      {learnerName} | {programmeName}
                    </p>
                    <span className={certificateStatusClass(record.status)}>{record.status}</span>
                  </div>
                  <p className="if-caption-text mt-1">
                    Certificate #{record.certificateNumber} | Issued {record.issueDate} | Released{" "}
                    {isoDate(record.releasedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={previewHref}
                      className="if-btn if-btn-secondary px-2 py-1 text-xs"
                    >
                      View certificate
                    </a>
                    {record.documentId ? (
                      <a
                        href={`/api/org/${params.orgSlug}/certificates/${record.documentId}/download`}
                        className="if-btn if-btn-secondary px-2 py-1 text-xs"
                      >
                        Download
                      </a>
                    ) : null}
                    {canManage ? (
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
                        <button className="if-btn if-btn-primary px-2 py-1 text-xs">
                          Reissue
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="if-panel-muted rounded-2xl p-4 text-sm">
        <p className="if-body-text">
          Need follow-up/outcome operations? Use{" "}
          <a
            href={`/org/${params.orgSlug}/app/follow-ups`}
            className="font-medium text-brand-accentStrong hover:text-brand-text"
          >
            Follow-Ups
          </a>{" "}
          to capture 3/6/12-month outcomes and evidence.
        </p>
      </section>
    </div>
  );
}
