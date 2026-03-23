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

function toLifecycleStatus(status: string) {
  switch (status) {
    case "SUBMITTED":
      return { label: "Uploaded", tone: "bg-slate-100 text-slate-700" };
    case "SCAN_PENDING":
      return { label: "OCR/scan started", tone: "bg-amber-100 text-amber-800" };
    case "SCAN_OK":
      return { label: "Parsed · verification pending", tone: "bg-sky-100 text-sky-800" };
    case "APPROVED":
      return { label: "Verified", tone: "bg-emerald-100 text-emerald-800" };
    case "REJECTED":
      return { label: "Rejected", tone: "bg-rose-100 text-rose-800" };
    case "SCAN_FAILED":
      return { label: "Action needed", tone: "bg-orange-100 text-orange-800" };
    default:
      return { label: status, tone: "bg-slate-100 text-slate-700" };
  }
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
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {getDocumentDisplayName(type)}
        </h3>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            required
              ? "border border-rose-200 bg-rose-50 text-rose-700"
              : "border border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {required ? "Required" : "Optional"}
        </span>
      </div>

      <div className="mt-3 text-sm text-slate-700">
        {!document && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            Not uploaded yet.
          </p>
        )}
        {document && (
          <div className="space-y-2">
            <p
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${status?.tone}`}
            >
              {status?.label}
            </p>
            <p className="text-xs text-slate-600">
              Last updated {document.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </p>
            {document.rejectionReason && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {document.rejectionReason}
              </p>
            )}
            {isCv && document.status === "SCAN_OK" && (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                CV parsed successfully. Name, email, skills, and experience summary can now be reviewed by the team.
              </p>
            )}
            {isCv && document.status === "SCAN_PENDING" && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                We are reading your CV now. We will show parsing and review updates here.
              </p>
            )}
          </div>
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
          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700"
        />
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
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
  const recentUpdates = documents.slice(0, 4);
  const uploadedType = typeof searchParams?.uploaded === "string" ? searchParams.uploaded : null;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] md:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Student Documents
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Documents for {programmeName ?? "your programme"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {requiredComplete} of {plan.required.length} required documents uploaded.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/app/student"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
            <Link
              href="/app/whatsapp-sim"
              className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
            >
              Open support
            </Link>
          </div>
        </div>
        {uploadedType && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Your {getDocumentDisplayName(uploadedType)} was uploaded successfully. Processing and verification updates will appear below.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Required documents</h2>
        <div className="grid gap-3 lg:grid-cols-2">
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Optional documents</h2>
        <div className="grid gap-3 lg:grid-cols-2">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent document updates
        </h2>
        <div className="mt-3 space-y-2">
          {recentUpdates.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No document updates yet.
            </p>
          )}
          {recentUpdates.map((doc) => (
            <p
              key={doc.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              {getDocumentDisplayName(doc.type)} · {toLifecycleStatus(doc.status).label}
              {doc.rejectionReason ? ` · ${doc.rejectionReason}` : ""}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
