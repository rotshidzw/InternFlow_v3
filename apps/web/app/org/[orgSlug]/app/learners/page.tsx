import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";
import { resolveProgrammeDocumentPlan } from "@/lib/student-document-requirements";
import { deriveStudentLifecycle } from "@/lib/student-lifecycle";

export default async function LearnersDirectoryPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) {
    redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  }

  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const applicationStatus =
    typeof searchParams?.applicationStatus === "string"
      ? searchParams.applicationStatus
      : "";
  const documentStatus =
    typeof searchParams?.documentStatus === "string" ? searchParams.documentStatus : "";
  const placementStatus =
    typeof searchParams?.placementStatus === "string" ? searchParams.placementStatus : "";

  const learners = await prisma.membership.findMany({
    where: {
      organizationId: access.membership.organizationId,
      role: "STUDENT",
    },
    include: {
      user: {
        include: {
          profile: true,
          applications: { orderBy: { createdAt: "desc" }, take: 1, include: { opportunity: true } },
          enrollments: {
            where: { organizationId: access.membership.organizationId },
            include: { program: true },
            orderBy: { id: "desc" },
            take: 1,
          },
          documents: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const rows = learners
    .map((membership) => {
      const latestApplication = membership.user.applications[0];
      const enrollment = membership.user.enrollments[0];
      const programmeNameForDocs =
        enrollment?.program?.name ?? latestApplication?.opportunity?.title ?? "";
      const docPlan = resolveProgrammeDocumentPlan(programmeNameForDocs);
      const lifecycle = deriveStudentLifecycle({
        hasUser: true,
        hasProfileCore: Boolean(membership.user.name && membership.user.profile?.phone),
        docs: membership.user.documents.map((d) => ({ status: d.status, type: d.type })),
        requiredDocumentTypes: docPlan.required,
        latestApplicationStatus: latestApplication?.status ?? null,
        latestApplicationSubmittedAt: latestApplication?.submittedAt ?? null,
        enrollmentStatus: enrollment?.status ?? null,
      });
      return {
        userId: membership.user.id,
        name: membership.user.name ?? "Unnamed learner",
        email: membership.user.email,
        phone: membership.user.profile?.phone ?? "",
        idNumber:
          typeof membership.user.profile?.education === "object" &&
          membership.user.profile?.education &&
          "idNumber" in (membership.user.profile.education as Record<string, unknown>)
            ? String(
                (membership.user.profile.education as Record<string, unknown>).idNumber ?? "",
              )
            : "",
        latestApplication,
        enrollment,
        lifecycle,
      };
    })
    .filter((row) => {
      const haystack = `${row.name} ${row.email} ${row.phone} ${row.idNumber}`.toLowerCase();
      if (q && !haystack.includes(q.toLowerCase())) return false;
      if (applicationStatus && row.lifecycle.applicationStatus !== applicationStatus) return false;
      if (documentStatus && row.lifecycle.documentStatus !== documentStatus) return false;
      if (placementStatus && row.lifecycle.placementStatus !== placementStatus) return false;
      return true;
    });

  return (
    <section className="if-auth-page">
      <div className="if-auth-hero">
        <h1 className="if-auth-title">Learner directory</h1>
        <p className="if-auth-subtitle">
          Search by name, email, phone, or ID number and filter by lifecycle status.
        </p>
      </div>

      <form className="if-auth-form if-filter-grid md:grid-cols-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search learner"
          className="rounded bg-white px-2 py-2 text-sm md:col-span-2"
        />
        <select
          name="applicationStatus"
          defaultValue={applicationStatus}
          className="rounded px-2 py-2 text-sm"
        >
          <option value="">Any application status</option>
          <option value="not_started">not_started</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="under_review">under_review</option>
          <option value="accepted">accepted</option>
          <option value="rejected">rejected</option>
        </select>
        <select
          name="documentStatus"
          defaultValue={documentStatus}
          className="rounded px-2 py-2 text-sm"
        >
          <option value="">Any document status</option>
          <option value="missing">missing</option>
          <option value="partial">partial</option>
          <option value="submitted">submitted</option>
          <option value="processing">processing</option>
          <option value="verified">verified</option>
          <option value="rejected">rejected</option>
        </select>
        <select
          name="placementStatus"
          defaultValue={placementStatus}
          className="rounded px-2 py-2 text-sm"
        >
          <option value="">Any placement status</option>
          <option value="unassigned">unassigned</option>
          <option value="shortlisted">shortlisted</option>
          <option value="assigned">assigned</option>
          <option value="active">active</option>
          <option value="completed">completed</option>
        </select>
        <button className="if-btn if-btn-primary px-3 py-2 text-sm font-semibold">
          Search
        </button>
      </form>

      <div className="if-auth-table-wrap">
        <table className="if-table-hover min-w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide">
              <th className="py-2 pr-3">Learner</th>
              <th className="py-2 pr-3">Application</th>
              <th className="py-2 pr-3">Documents</th>
              <th className="py-2 pr-3">Placement</th>
              <th className="py-2 pr-3">Programme</th>
              <th className="py-2">View</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-b border-brand-border/40">
                <td className="py-2 pr-3">
                  <p className="font-medium text-brand-text">{row.name}</p>
                  <p className="text-xs text-brand-muted">{row.email}</p>
                </td>
                <td className="py-2 pr-3 text-brand-textSoft">{row.lifecycle.applicationStatus}</td>
                <td className="py-2 pr-3 text-brand-textSoft">{row.lifecycle.documentStatus}</td>
                <td className="py-2 pr-3 text-brand-textSoft">{row.lifecycle.placementStatus}</td>
                <td className="py-2 pr-3 text-brand-textSoft">{row.enrollment?.program?.name ?? "Unassigned"}</td>
                <td className="py-2">
                  <Link
                    href={`/org/${params.orgSlug}/app/learners/${row.userId}`}
                    className="if-btn if-btn-secondary px-2 py-1 text-xs"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-sm text-brand-muted">
                  No learners found. Try a broader query or clear filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
