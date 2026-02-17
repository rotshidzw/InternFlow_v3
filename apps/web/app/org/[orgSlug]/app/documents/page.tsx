import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { assertTenantAreaAccess } from "@/lib/tenant-rbac";

const BASE_REQUIRED_DOCS = ["ID", "CV", "CERTIFICATE", "AFFIDAVIT", "PROOF_OF_ADDRESS"];

function validationBadge(status: string, doc: { type: string; expirationDate: Date | null; selfCertifiedAt: Date | null }) {
  if (status === "SCAN_FAILED") return "REJECTED";
  if (status === "SCAN_PENDING") return "NEEDS_REVIEW";
  if (doc.expirationDate && doc.expirationDate < new Date()) return "EXPIRED";
  if (!doc.selfCertifiedAt && ["CERTIFICATE", "AFFIDAVIT"].includes(doc.type)) return "MISSING_SIGNATURE";
  return "VALID";
}

function normalizeRequiredDocs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).toUpperCase().trim()).filter(Boolean);
}

function readDocsFromRequirementsJson(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const docs = (value as { docs?: unknown }).docs;
  return normalizeRequiredDocs(docs);
}

function programRequiresMonthlyPayslip(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Boolean((value as { monthlyPayslip?: unknown }).monthlyPayslip);
}

export default async function DocumentsPage({
  params,
  searchParams
}: {
  params: { orgSlug: string };
  searchParams?: { q?: string; program?: string };
}) {
  const access = await requireTenantAccess(params.orgSlug);
  assertTenantAreaAccess(params.orgSlug, access.membership.role, "documents");

  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: access.membership.organizationId },
    include: { user: true, program: true },
    orderBy: [{ program: { name: "asc" } }, { user: { email: "asc" } }],
    take: 200
  });

  const programIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.programId)));
  const learnerIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.userId)));

  const opportunities = await prisma.opportunity.findMany({
    where: {
      organizationId: access.membership.organizationId,
      ...(programIds.length ? { programId: { in: programIds } } : {})
    },
    select: { programId: true, requirementsJson: true }
  });

  const docs = await prisma.document.findMany({
    where: { userId: { in: learnerIds } },
    include: { user: true, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 1000
  });

  const docsByUser = docs.reduce<Record<string, typeof docs>>((acc, doc) => {
    acc[doc.userId] ??= [];
    acc[doc.userId].push(doc);
    return acc;
  }, {});

  const requiredDocsByProgram = opportunities.reduce<Record<string, Set<string>>>((acc, opportunity) => {
    const key = opportunity.programId ?? "_general";
    acc[key] ??= new Set<string>();

    for (const docType of readDocsFromRequirementsJson(opportunity.requirementsJson)) {
      acc[key].add(docType);
    }

    return acc;
  }, {});

  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const selectedProgram = (searchParams?.program ?? "").trim();

  const rows = enrollments
    .filter((enrollment) => {
      if (selectedProgram && enrollment.programId !== selectedProgram) return false;
      if (!query) return true;
      return enrollment.user.email.toLowerCase().includes(query) || enrollment.program.name.toLowerCase().includes(query);
    })
    .map((enrollment) => {
      const userDocs = docsByUser[enrollment.userId] ?? [];
      const latestByType = userDocs.reduce<Record<string, (typeof userDocs)[number]>>((acc, doc) => {
        if (!acc[doc.type]) acc[doc.type] = doc;
        return acc;
      }, {});

      const dynamicRequired = Array.from(requiredDocsByProgram[enrollment.programId] ?? []);
      const monthlyPayslipRequired = programRequiresMonthlyPayslip(enrollment.program.rulesJson);
      const requiredDocTypes = Array.from(new Set([...BASE_REQUIRED_DOCS, ...dynamicRequired, ...(monthlyPayslipRequired ? ["PAYSLIP"] : [])]));

      const missingDocTypes = requiredDocTypes.filter((docType) => !latestByType[docType]);
      const payslips = userDocs.filter((doc) => doc.type === "PAYSLIP" && doc.versions[0]);

      return {
        enrollment,
        userDocs,
        latestByType,
        requiredDocTypes,
        missingDocTypes,
        payslips
      };
    });

  const totalDocs = docs.length;
  const totalPayslips = docs.filter((doc) => doc.type === "PAYSLIP").length;
  const learnersWithMissingDocs = rows.filter((row) => row.missingDocTypes.length > 0).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Document Vault</h1>
        <p className="text-sm text-slate-600">All learner documents by student and program, including payslips generated when stipend payments are captured.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Enrollments</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total docs</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalDocs}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Payslips</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{totalPayslips}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs uppercase tracking-wide text-amber-700">Learners missing docs</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{learnersWithMissingDocs}</p>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3" method="get">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Search learner/program
          <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="email or program" className="h-9 min-w-[220px] rounded-md border border-slate-300 px-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Program
          <select name="program" defaultValue={selectedProgram} className="h-9 min-w-[220px] rounded-md border border-slate-300 px-2 text-sm">
            <option value="">All programs</option>
            {Array.from(new Map(enrollments.map((item) => [item.programId, item.program.name])).entries()).map(([programId, programName]) => (
              <option key={programId} value={programId}>{programName}</option>
            ))}
          </select>
        </label>
        <button className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700">Apply</button>
      </form>

      <div className="space-y-3">
        {rows.map((row) => (
          <section key={row.enrollment.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-slate-900">{row.enrollment.user.email} · {row.enrollment.program.name}</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{row.enrollment.status}</span>
            </div>

            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-semibold text-emerald-700">Payslips (priority)</p>
              <p className="text-xs text-emerald-700">When stipend is marked paid, a system payslip PDF is auto-added here for this learner.</p>
              {row.payslips.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.payslips.slice(0, 6).map((doc) => {
                    const version = doc.versions[0];
                    if (!version) return null;

                    return (
                      <a
                        key={doc.id}
                        href={`/api/org/${params.orgSlug}/documents/${doc.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        View payslip · {doc.createdAt.toISOString().slice(0, 10)}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1 text-xs text-amber-700">No payslip captured yet for this learner.</p>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-700">Required document coverage (student + program)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {row.requiredDocTypes.map((docType) => (
                  <span
                    key={docType}
                    className={`rounded-full px-2 py-1 text-xs font-medium ${row.missingDocTypes.includes(docType) ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    {docType} {row.missingDocTypes.includes(docType) ? "(missing)" : "(available)"}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-700">All collected documents</p>
              {row.userDocs.length ? (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {row.userDocs.slice(0, 12).map((doc) => {
                    const version = doc.versions[0];
                    return (
                      <div key={doc.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                        <p className="font-medium text-slate-800">{doc.type}</p>
                        <p className="text-slate-600">Review: {doc.status} · Validation: {validationBadge(doc.status, doc)}</p>
                        <p className="text-slate-500">Uploaded: {doc.createdAt.toISOString().slice(0, 10)} · File: {version?.mimeType ?? "n/a"}</p>
                        {version && (
                          <a
                            href={`/api/org/${params.orgSlug}/documents/${doc.id}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-100"
                          >
                            Open document
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">No documents uploaded yet.</p>
              )}
            </div>
          </section>
        ))}

        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No learner records found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
