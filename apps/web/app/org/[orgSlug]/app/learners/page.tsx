import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";
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
      const lifecycle = deriveStudentLifecycle({
        hasUser: true,
        hasProfileCore: Boolean(membership.user.name && membership.user.profile?.phone),
        docs: membership.user.documents.map((d) => ({ status: d.status })),
        latestApplicationStatus: latestApplication?.status ?? null,
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Learner directory</h1>
      <p className="mt-1 text-sm text-slate-600">
        Search by name, surname, email, phone, or ID number and filter by lifecycle status.
      </p>

      <form className="mt-4 grid gap-2 md:grid-cols-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search learner"
          className="rounded border border-slate-300 bg-white px-2 py-2 text-sm md:col-span-2"
        />
        <select
          name="applicationStatus"
          defaultValue={applicationStatus}
          className="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
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
          className="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
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
          className="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
        >
          <option value="">Any placement status</option>
          <option value="unassigned">unassigned</option>
          <option value="shortlisted">shortlisted</option>
          <option value="assigned">assigned</option>
          <option value="active">active</option>
          <option value="completed">completed</option>
        </select>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Search
        </button>
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
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
              <tr key={row.userId} className="border-b border-slate-100">
                <td className="py-2 pr-3">
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </td>
                <td className="py-2 pr-3">{row.lifecycle.applicationStatus}</td>
                <td className="py-2 pr-3">{row.lifecycle.documentStatus}</td>
                <td className="py-2 pr-3">{row.lifecycle.placementStatus}</td>
                <td className="py-2 pr-3">{row.enrollment?.program?.name ?? "Unassigned"}</td>
                <td className="py-2">
                  <Link
                    href={`/org/${params.orgSlug}/app/learners/${row.userId}`}
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
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
