import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  getDocumentDisplayName,
  resolveProgrammeDocumentPlan,
  type StudentDocumentType,
} from "@/lib/student-document-requirements";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type LifecycleStatusTone = {
  label: string;
  badgeClass: string;
};

function toLifecycleStatus(status: string): LifecycleStatusTone {
  switch (status) {
    case "SUBMITTED":
      return {
        label: "Uploaded",
        badgeClass: "if-status if-status-draft",
      };
    case "SCAN_PENDING":
      return {
        label: "OCR scan in progress",
        badgeClass: "if-status if-status-warning",
      };
    case "SCAN_OK":
      return {
        label: "Parsed - verification pending",
        badgeClass: "if-status if-status-pending",
      };
    case "APPROVED":
      return {
        label: "Verified",
        badgeClass: "if-status if-status-success",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        badgeClass: "if-status if-status-error",
      };
    case "SCAN_FAILED":
      return {
        label: "Action needed",
        badgeClass: "if-status if-status-warning",
      };
    default:
      return {
        label: status,
        badgeClass: "if-status if-status-draft",
      };
  }
}

function formatTimestamp(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function DocumentCard({
  type,
  required,
  userId,
  document,
}: {
  type: StudentDocumentType;
  required: boolean;
  userId: string;
  document:
    | {
        id: string;
        status: string;
        rejectionReason: string | null;
        createdAt: Date;
      }
    | undefined;
}) {
  const status = document ? toLifecycleStatus(document.status) : null;
  const isCv = type === "CV";

  return (
    <article className="if-panel-muted rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="if-card-title">{getDocumentDisplayName(type)}</h3>
        <span className={required ? "if-status if-status-warning" : "if-status if-status-draft"}>
          {required ? "Required" : "Optional"}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {!document ? (
          <p className="if-empty-state text-xs">Not uploaded yet.</p>
        ) : (
          <>
            <p className={status?.badgeClass}>{status?.label}</p>
            <p className="if-caption-text">Last updated {formatTimestamp(document.createdAt)}</p>
            {document.rejectionReason ? (
              <p className="if-status if-status-error">{document.rejectionReason}</p>
            ) : null}
            {isCv && document.status === "SCAN_OK" ? (
              <p className="if-caption-text">
                CV parsed successfully. Name, email, skills, and experience summary are available
                for team review.
              </p>
            ) : null}
            {isCv && document.status === "SCAN_PENDING" ? (
              <p className="if-caption-text">
                CV parsing is running now. Review updates will appear on this card.
              </p>
            ) : null}
          </>
        )}
      </div>

      <form
        action="/api/documents/upload"
        method="post"
        encType="multipart/form-data"
        className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="redirectTo" value="/app/student/documents" />
        <input
          type="file"
          name="file"
          required
          className="h-10 rounded px-2 text-xs"
        />
        <button className="if-btn if-btn-primary h-10 px-3 text-xs">
          {document ? "Re-upload" : "Upload"}
        </button>
      </form>
    </article>
  );
}

export default async function StudentDocumentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const context = await resolveStudentTenantContext(user.id);
  const programmeName =
    context.type === "ENROLLED"
      ? context.enrollment.programName
      : context.type === "APPLICATION"
        ? context.application.opportunityTitle
        : null;
  const plan = resolveProgrammeDocumentPlan(programmeName);

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const latestByType = new Map<string, (typeof documents)[number]>();
  for (const doc of documents) {
    if (!latestByType.has(doc.type)) latestByType.set(doc.type, doc);
  }

  const requiredComplete = plan.required.filter((type) => latestByType.has(type)).length;
  const optionalUploaded = plan.optional.filter((type) => latestByType.has(type)).length;
  const processingCount = documents.filter((doc) =>
    ["SUBMITTED", "SCAN_PENDING", "SCAN_OK"].includes(doc.status),
  ).length;
  const needsAttentionCount = documents.filter((doc) =>
    ["REJECTED", "SCAN_FAILED"].includes(doc.status),
  ).length;
  const recentUpdates = documents.slice(0, 6);
  const attentionQueue = documents
    .filter((doc) => ["REJECTED", "SCAN_FAILED", "SCAN_PENDING"].includes(doc.status))
    .slice(0, 6);
  const uploadedType = typeof searchParams?.uploaded === "string" ? searchParams.uploaded : null;

  return (
    <div className="if-auth-page min-h-[calc(100vh-7rem)] p-4 md:p-6">
      <section className="if-auth-hero">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="if-marketing-eyebrow text-brand-accentStrong">Student Documents</p>
            <h1 className="if-auth-title mt-2">
              Documents for {programmeName ?? "your programme"}
            </h1>
            <p className="if-auth-subtitle">
              Upload required evidence, track verification, and resolve flagged documents before
              application and placement decisions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action="/api/auth/logout" method="post">
              <button className="if-btn if-btn-secondary if-btn-nav text-xs">Log out</button>
            </form>
            <Link href="/app/student" className="if-btn if-btn-secondary if-btn-nav text-xs">
              Back to dashboard
            </Link>
            <Link href="/app/whatsapp-sim" className="if-btn if-btn-primary if-btn-nav text-xs">
              Open support
            </Link>
          </div>
        </div>

        {uploadedType ? (
          <p className="if-status if-status-success mt-3">
            Your {getDocumentDisplayName(uploadedType)} was uploaded successfully.
          </p>
        ) : null}
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Required complete</p>
          <p className="if-auth-metric-value">
            {requiredComplete}/{plan.required.length}
          </p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Optional uploaded</p>
          <p className="if-auth-metric-value">
            {optionalUploaded}/{plan.optional.length}
          </p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Processing</p>
          <p className="if-auth-metric-value">{processingCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Needs attention</p>
          <p className="if-auth-metric-value">{needsAttentionCount}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Total uploads</p>
          <p className="if-auth-metric-value">{documents.length}</p>
        </article>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Attention queue</h2>
        <p className="if-panel-copy mt-1">
          Prioritize rejected or failed documents first, then monitor OCR items still in progress.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {attentionQueue.length === 0 ? (
            <p className="if-empty-state text-sm">No attention items right now.</p>
          ) : (
            attentionQueue.map((doc) => (
              <article key={doc.id} className="if-panel-muted rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="if-card-title">{getDocumentDisplayName(doc.type)}</p>
                  <span className={toLifecycleStatus(doc.status).badgeClass}>
                    {toLifecycleStatus(doc.status).label}
                  </span>
                </div>
                <p className="if-caption-text mt-1">Updated {formatTimestamp(doc.createdAt)}</p>
                {doc.rejectionReason ? (
                  <p className="if-status if-status-error mt-1">{doc.rejectionReason}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Required documents</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {plan.required.map((type) => (
            <DocumentCard
              key={type}
              type={type}
              required
              userId={user.id}
              document={latestByType.get(type)}
            />
          ))}
        </div>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Optional documents</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {plan.optional.map((type) => (
            <DocumentCard
              key={type}
              type={type}
              required={false}
              userId={user.id}
              document={latestByType.get(type)}
            />
          ))}
        </div>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Recent document updates</h2>
        <div className="mt-3 space-y-2 text-sm">
          {recentUpdates.length === 0 ? (
            <p className="if-empty-state text-sm">No document updates yet.</p>
          ) : (
            recentUpdates.map((doc) => (
              <p key={doc.id} className="if-panel-muted rounded-lg px-3 py-2">
                {getDocumentDisplayName(doc.type)} | {toLifecycleStatus(doc.status).label}
                {doc.rejectionReason ? ` | ${doc.rejectionReason}` : ""}
              </p>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
