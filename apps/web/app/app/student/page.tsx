import Link from "next/link";
import { Bell, CheckCircle2, Clock3, FileText, MessageSquare, UserCircle2 } from "lucide-react";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  getDocumentDisplayName,
  resolveProgrammeDocumentPlan,
} from "@/lib/student-document-requirements";
import {
  applyCertificateReleaseTransitionsWithAudit,
  loadOrganizationCertificateRecords,
  loadOrganizationFollowUpRecords,
} from "@/lib/provider-operations";
import { deriveStudentLifecycle } from "@/lib/student-lifecycle";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

type StudentPortalProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function docStatusLabel(status: string) {
  switch (status) {
    case "SCAN_PENDING":
      return "OCR/scan started";
    case "SCAN_OK":
      return "Parsed · verification pending";
    case "APPROVED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "SCAN_FAILED":
      return "Action needed";
    case "SUBMITTED":
      return "Uploaded";
    default:
      return status;
  }
}

function applicationStatusLabel(status: string) {
  if (status === "not_started") return "Not started";
  if (status === "draft") return "Draft saved";
  if (status === "submitted") return "Submitted";
  if (status === "under_review") return "Under review";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  return status.replace("_", " ");
}

function placementStatusLabel(status: string) {
  if (status === "unassigned") return "Placement not assigned yet";
  if (status === "shortlisted") return "Under review";
  if (status === "assigned") return "Assigned - awaiting programme start";
  if (status === "active") return "Assigned and active";
  if (status === "completed") return "Placement completed";
  return status.replace("_", " ");
}

function isoDate(value: string | Date | null | undefined) {
  if (!value) return "n/a";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toISOString().slice(0, 10);
}

export default async function StudentPortalPage({ searchParams }: StudentPortalProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true },
  });
  const hasStudentMembership = memberships.some((m) => m.role === "STUDENT");
  const nonStudentMembership = memberships.find((m) => m.role !== "STUDENT");
  if (!hasStudentMembership && nonStudentMembership) {
    redirect(`/org/${nonStudentMembership.organization.slug}/app/dashboard`);
  }

  const context = await resolveStudentTenantContext(user.id);
  const programmeName =
    context.type === "ENROLLED"
      ? context.enrollment.programName
      : context.type === "APPLICATION"
        ? context.application.opportunityTitle
        : null;
  const docPlan = resolveProgrammeDocumentPlan(programmeName);
  const enrollmentStatus = context.type === "ENROLLED" ? context.enrollment.status : null;
  const programWorkspaceUrl =
    context.type === "ENROLLED"
      ? `/org/${context.enrollment.organizationSlug}/student`
      : context.type === "APPLICATION"
        ? `/org/${context.application.organizationSlug}/student`
        : null;
  const hasWorkspaceMembership =
    context.type === "ENROLLED"
      ? memberships.some(
          (membership) =>
            membership.organization.slug === context.enrollment.organizationSlug,
        )
      : context.type === "APPLICATION"
        ? memberships.some(
            (membership) =>
              membership.organization.slug === context.application.organizationSlug,
          )
        : false;
  const contextOrganizationId =
    context.type === "ENROLLED" ? context.enrollment.organizationId : null;
  const contextOrganizationSlug =
    context.type === "ENROLLED"
      ? context.enrollment.organizationSlug
      : context.type === "APPLICATION"
        ? context.application.organizationSlug
        : null;
  const contextEnrollmentId =
    context.type === "ENROLLED" ? context.enrollment.id : null;

  if (contextOrganizationId) {
    await applyCertificateReleaseTransitionsWithAudit({
      organizationId: contextOrganizationId,
      actorUserId: user.id,
    });
  }

  const [
    profile,
    documents,
    notifications,
    threadCount,
    recentThreads,
    payslips,
    latestApplication,
    certificateRecords,
    followUpRecords,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.chatThread.count({ where: { userId: user.id } }),
    prisma.chatThread.findMany({
      where: { userId: user.id },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.document.count({ where: { userId: user.id, type: "PAYSLIP" } }),
    prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      include: { opportunity: true },
    }),
    contextOrganizationId
      ? loadOrganizationCertificateRecords(contextOrganizationId)
      : Promise.resolve([]),
    contextOrganizationId
      ? loadOrganizationFollowUpRecords(contextOrganizationId)
      : Promise.resolve([]),
  ]);

  const latestByType = new Map<string, (typeof documents)[number]>();
  for (const doc of documents) {
    if (!latestByType.has(doc.type)) latestByType.set(doc.type, doc);
  }
  const requiredDone = docPlan.required.filter((type) => latestByType.has(type)).length;
  const requiredProgress = docPlan.required.length
    ? Math.round((requiredDone / docPlan.required.length) * 100)
    : 0;
  const recentDocumentUpdates = documents.slice(0, 4);

  const showApplied = searchParams?.applied === "1";
  const showAlreadyApplied = searchParams?.notice === "already-applied";
  const showDraftSaved = searchParams?.notice === "draft-saved";
  const showActiveEnrollmentError = searchParams?.error === "active-enrollment";

  const profileChecks = [Boolean(user.name), Boolean(profile?.phone), Boolean(profile?.education)];
  const profileCompletion = Math.round(
    (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
  );
  const lifecycle = deriveStudentLifecycle({
    hasUser: true,
    hasProfileCore: profileCompletion >= 100,
    docs: documents.map((d) => ({ status: d.status, type: d.type })),
    requiredDocumentTypes: docPlan.required,
    latestApplicationStatus: latestApplication?.status ?? null,
    latestApplicationSubmittedAt: latestApplication?.submittedAt ?? null,
    enrollmentStatus,
  });
  const documentsReady = requiredDone === docPlan.required.length && docPlan.required.length > 0;
  const shouldShowApplyNow = ["not_started", "draft", "rejected"].includes(lifecycle.applicationStatus);
  const canOpenProgramWorkspace =
    hasWorkspaceMembership &&
    ["assigned", "active", "completed"].includes(lifecycle.placementStatus);
  const studentCertificateRecord = contextEnrollmentId
    ? certificateRecords.find(
        (record) =>
          record.enrollmentId === contextEnrollmentId && record.userId === user.id,
      ) ?? null
    : null;
  const studentFollowUps = contextEnrollmentId
    ? followUpRecords
        .filter((record) => record.enrollmentId === contextEnrollmentId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    : [];
  const now = new Date();
  const nextDueFollowUp =
    studentFollowUps.find((record) => record.status === "DUE") ?? null;
  const overdueFollowUpCount = studentFollowUps.filter(
    (record) => record.status === "DUE" && new Date(record.dueDate) <= now,
  ).length;
  const completedFollowUpCount = studentFollowUps.filter(
    (record) => record.status === "COMPLETED",
  ).length;
  const certificateDownloadHref =
    contextOrganizationSlug &&
    studentCertificateRecord?.documentId &&
    studentCertificateRecord.status === "RELEASED"
      ? `/api/org/${contextOrganizationSlug}/certificates/${studentCertificateRecord.documentId}/download`
      : null;
  const certificateStatusText =
    context.type !== "ENROLLED"
      ? "Certificate status starts after programme placement and completion."
      : enrollmentStatus !== "COMPLETED"
        ? "Not eligible yet. Certificate eligibility starts once programme status is completed."
        : !studentCertificateRecord
          ? "Eligible. Waiting for provider/coordinator issuance."
          : studentCertificateRecord.status === "RELEASED"
            ? "Certificate available now."
            : `Issued with delayed release. Available from ${isoDate(studentCertificateRecord.releaseAt)}.`;
  const followUpStatusText =
    context.type !== "ENROLLED" || enrollmentStatus !== "COMPLETED"
      ? "Follow-up tracking starts after programme completion."
      : studentFollowUps.length === 0
        ? "Follow-up schedule is not created yet."
        : nextDueFollowUp
          ? `Next follow-up: ${nextDueFollowUp.dueMonth}-month due ${isoDate(nextDueFollowUp.dueDate)}.`
          : "All scheduled follow-ups are completed.";

  return (
    <div className="min-h-[calc(100vh-7rem)] space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] md:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Student Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Welcome, {user.name ?? "Student"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {["assigned", "active", "completed"].includes(lifecycle.placementStatus) && programmeName
                ? `Programme: ${programmeName}`
                : "Placement not assigned yet. Complete profile, documents, and application steps to move forward."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form action="/api/auth/logout" method="post">
              <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Log out
              </button>
            </form>
            <Link
              href="/app/student/documents"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Upload documents
            </Link>
            <Link
              href="/app/whatsapp-sim"
              className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              Ask for support
            </Link>
            <a
              href={canOpenProgramWorkspace ? (programWorkspaceUrl ?? "/app/student") : "/app/student"}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Check programme status
            </a>
          </div>
        </div>

        {(showApplied || showAlreadyApplied || showDraftSaved || showActiveEnrollmentError) && (
          <div className="mt-4 grid gap-2">
            {showApplied && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Application submitted successfully.
              </div>
            )}
            {showDraftSaved && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                Application draft saved. Submit when ready.
              </div>
            )}
            {showAlreadyApplied && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                You already submitted this application.
              </div>
            )}
            {showActiveEnrollmentError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                You already have an active enrollment in another organization.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <FileText className="h-4 w-4 text-sky-600" />
            Required docs
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {requiredDone}/{docPlan.required.length}
          </p>
          <p className="text-xs text-slate-500">{requiredProgress}% complete</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Clock3 className="h-4 w-4 text-amber-600" />
            Profile completion
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{profileCompletion}%</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <MessageSquare className="h-4 w-4 text-violet-600" />
            Discussions
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{threadCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Payments & Certificate
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{payslips}</p>
          <p className="text-xs text-slate-500">Payslips on file</p>
          <p className="mt-1 text-xs text-slate-600">{certificateStatusText}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Application</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {applicationStatusLabel(lifecycle.applicationStatus)}
          </p>
          {documentsReady && shouldShowApplyNow && (
            <p className="mt-1 text-xs text-emerald-700">Documents ready · application not submitted</p>
          )}
        </article>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Lifecycle status</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Profile: {lifecycle.profileStatus === "complete" ? "Complete" : "Incomplete"}</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Documents: {lifecycle.documentStatus.replace("_", " ")}</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Application: {applicationStatusLabel(lifecycle.applicationStatus)}</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Placement: {placementStatusLabel(lifecycle.placementStatus)}</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Programme: {lifecycle.programmeStatus.replace("_", " ")}</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Account: {lifecycle.accountStatus}</p>
          </div>
          {shouldShowApplyNow && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              <span>{documentsReady ? "Documents ready. Submit your application to continue." : "Complete required documents, then submit your application."}</span>
              <Link href="/opportunities" className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800">
                Submit application
              </Link>
            </div>
          )}
          {lifecycle.applicationStatus === "under_review" && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Application under review. You can still update documents if requested.
            </p>
          )}
          {lifecycle.applicationStatus === "accepted" && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Application accepted. Placement remains separate and appears only once assigned.
            </p>
          )}
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Certificate</p>
              <p>{certificateStatusText}</p>
              {studentCertificateRecord && (
                <p className="mt-1 text-xs text-slate-600">
                  Certificate number: {studentCertificateRecord.certificateNumber} | Issue date:{" "}
                  {studentCertificateRecord.issueDate}
                </p>
              )}
              {certificateDownloadHref && (
                <a
                  href={certificateDownloadHref}
                  className="mt-2 inline-block rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                >
                  Download certificate
                </a>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Post-training follow-up</p>
              <p>{followUpStatusText}</p>
              {studentFollowUps.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  Completed: {completedFollowUpCount}/{studentFollowUps.length} | Overdue:{" "}
                  {overdueFollowUpCount}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Required document checklist</h2>
            <Link
              href="/app/student/documents"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Go to Documents
            </Link>
          </div>
          <div className="mt-3 grid gap-2">
            {docPlan.required.map((type) => {
              const current = latestByType.get(type);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{getDocumentDisplayName(type)}</span>
                  <span className="text-xs text-slate-600">
                    {current ? docStatusLabel(current.status) : "Not uploaded"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Bell className="h-5 w-5 text-amber-500" />
            Recent updates
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            {recentDocumentUpdates.map((doc) => (
              <p
                key={doc.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
              >
                {getDocumentDisplayName(doc.type)} · {docStatusLabel(doc.status)}
                {doc.rejectionReason ? ` · ${doc.rejectionReason}` : ""}
              </p>
            ))}
            {recentDocumentUpdates.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                No document updates yet.
              </p>
            )}
            {notifications.map((n) => (
              <p
                key={n.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
              >
                {n.title}: {n.body}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Discussions & support</h2>
          <Link
            href="/app/whatsapp-sim"
            className="text-xs font-semibold text-violet-700 hover:text-violet-800"
          >
            Open support
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Use support for questions, status clarification, and help requests. Uploads happen in the Documents page.
        </p>
        <div className="mt-3 grid gap-2">
          {recentThreads.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No discussion history yet.
            </p>
          )}
          {recentThreads.map((thread) => (
            <div
              key={thread.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {thread.title}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {thread.messages[0]?.body ?? "No messages in this thread yet."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/student/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <UserCircle2 className="h-4 w-4" />
            View profile
          </Link>
          <Link
            href="/app/student/profile/edit"
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Edit profile
          </Link>
          {(lifecycle.programmeStatus === "completed" || payslips > 0) && (
            <Link
              href="/app/whatsapp-sim"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Request certificate or payslip
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
