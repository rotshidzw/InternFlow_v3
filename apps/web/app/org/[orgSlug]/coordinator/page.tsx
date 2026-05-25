import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";
import { resolveProgrammeDocumentPlan } from "@/lib/student-document-requirements";
import { deriveStudentLifecycle } from "@/lib/student-lifecycle";

function matchQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default async function CoordinatorPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access)
    redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");

  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const applicationFilter =
    typeof searchParams?.applicationStatus === "string"
      ? searchParams.applicationStatus
      : "";
  const documentFilter =
    typeof searchParams?.documentStatus === "string" ? searchParams.documentStatus : "";
  const placementFilter =
    typeof searchParams?.placementStatus === "string" ? searchParams.placementStatus : "";
  const programmeFilter =
    typeof searchParams?.programme === "string" ? searchParams.programme : "";

  const [students, pendingDocs, programs] = await Promise.all([
    prisma.membership.findMany({
      where: {
        organizationId: access.membership.organizationId,
        role: "STUDENT",
      },
      include: {
        user: {
          include: {
            profile: true,
            applications: {
              include: { opportunity: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
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
      take: 300,
    }),
    prisma.document.findMany({
      where: {
        status: { in: ["SUBMITTED", "SCAN_PENDING", "SCAN_FAILED"] },
        user: {
          memberships: {
            some: { organizationId: access.membership.organizationId },
          },
        },
      },
      include: { user: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.program.findMany({
      where: { organizationId: access.membership.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = students.map((membership) => {
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
      membershipId: membership.id,
      userId: membership.user.id,
      name: membership.user.name ?? "",
      email: membership.user.email,
      phone: membership.user.profile?.phone ?? "",
      latestApplication,
      enrollment,
      lifecycle,
      documentsCount: membership.user.documents.length,
    };
  });

  const filtered = rows.filter((row) => {
    const haystack = `${row.name} ${row.email} ${row.phone}`.trim();
    if (q && !matchQuery(haystack, q)) return false;
    if (applicationFilter && row.lifecycle.applicationStatus !== applicationFilter)
      return false;
    if (documentFilter && row.lifecycle.documentStatus !== documentFilter) return false;
    if (placementFilter && row.lifecycle.placementStatus !== placementFilter) return false;
    if (programmeFilter && row.enrollment?.program?.id !== programmeFilter) return false;
    return true;
  });

  return (
    <AppShell
      orgSlug={params.orgSlug}
      role={access.membership.role}
      orgName={access.membership.organization.name}
    >
      <h1 className="text-2xl font-semibold">Coordinator learner directory</h1>
      <p className="mt-1 text-sm text-slate-600">
        Search learners and filter by lifecycle state to review submissions and placement readiness.
      </p>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <form className="grid gap-2 md:grid-cols-5">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, phone"
            className="rounded border border-slate-300 bg-white px-2 py-2 text-sm md:col-span-2"
          />
          <select
            name="applicationStatus"
            defaultValue={applicationFilter}
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
            defaultValue={documentFilter}
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
            defaultValue={placementFilter}
            className="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
          >
            <option value="">Any placement status</option>
            <option value="unassigned">unassigned</option>
            <option value="shortlisted">shortlisted</option>
            <option value="assigned">assigned</option>
            <option value="active">active</option>
            <option value="completed">completed</option>
          </select>
          <select
            name="programme"
            defaultValue={programmeFilter}
            className="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
          >
            <option value="">Any programme</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          <button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Search
          </button>
        </form>
      </section>

      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Students ({filtered.length})</h2>
          <span className="text-xs text-slate-500">Recent registrations included</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Learner</th>
                <th className="py-2 pr-3">Application</th>
                <th className="py-2 pr-3">Documents</th>
                <th className="py-2 pr-3">Placement</th>
                <th className="py-2 pr-3">Programme</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.membershipId} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-slate-900">{row.name || "Unnamed learner"}</p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </td>
                  <td className="py-2 pr-3">{row.lifecycle.applicationStatus}</td>
                  <td className="py-2 pr-3">
                    {row.lifecycle.documentStatus} ({row.documentsCount})
                  </td>
                  <td className="py-2 pr-3">{row.lifecycle.placementStatus}</td>
                  <td className="py-2 pr-3">{row.enrollment?.program?.name ?? "Unassigned"}</td>
                  <td className="py-2">
                    <Link
                      href={`/org/${params.orgSlug}/app/learners/${row.userId}`}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                    No learners matched the current search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Documents requiring attention</h2>
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          {pendingDocs.map((d) => (
            <p key={d.id}>
              {d.user.email} · {d.type} · {d.status}
            </p>
          ))}
          {pendingDocs.length === 0 && <p className="text-slate-500">No pending document issues.</p>}
        </div>
      </section>
    </AppShell>
  );
}
