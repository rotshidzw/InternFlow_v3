import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function CertificatesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);

  const [completedEnrollments, allEnrollments, certificates] = await Promise.all([
    prisma.enrollment.findMany({
      where: { organizationId: access.membership.organizationId, status: "COMPLETED" },
      include: { user: true, program: true },
      take: 100
    }),
    prisma.enrollment.findMany({
      where: { organizationId: access.membership.organizationId },
      include: { user: true, program: true },
      orderBy: { id: "desc" },
      take: 300
    }),
    prisma.document.findMany({
      where: { organizationId: access.membership.organizationId, type: "CERTIFICATE" },
      include: { user: true, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { id: "desc" },
      take: 100
    })
  ]);
  const latestEnrollmentByUser = new Map<string, { id: string; programName: string }>();
  for (const enrollment of allEnrollments) {
    if (!latestEnrollmentByUser.has(enrollment.userId)) {
      latestEnrollmentByUser.set(enrollment.userId, { id: enrollment.id, programName: enrollment.program.name });
    }
  }
  const programs = Array.from(new Map(completedEnrollments.map((enrollment) => [enrollment.programId, enrollment.program])).values());


  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Certificate issue + signed PDF</h1>
            <p className="text-sm text-slate-600">Issue a certificate in one click, preview design with stamp/signature, then download.</p>
          </div>
          <Link
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
            href={`/org/${params.orgSlug}/app/certificates/preview?tenant=${encodeURIComponent(access.membership.organization.name)}&learner=Demo%20Learner&programme=Demo%20Programme&manager=${encodeURIComponent(access.user.name ?? "Programme Manager")}&signature=Signed%20digitally`}
          >
            View demo certificate
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Bulk download certificates (ZIP)</h2>
        <p className="mt-1 text-sm text-slate-600">Generates clean PDFs using the same certificate engine and bundles them per programme folder.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a className="rounded border border-slate-300 px-3 py-1 text-slate-700" href={`/api/org/${params.orgSlug}/certificates/issue`}>
            Download all completed certificates (ZIP)
          </a>
          {programs.map((program) => (
            <a key={program.id} className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700" href={`/api/org/${params.orgSlug}/certificates/issue?programId=${program.id}`}>
              {program.name} (ZIP)
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Issue certificate</h2>
        <div className="mt-3 space-y-3 text-sm">
          {completedEnrollments.length === 0 ? <p className="text-slate-500">No completed enrollments yet.</p> : completedEnrollments.map((enrollment) => {
            const learnerName = enrollment.user.name ?? enrollment.user.email;
            const managerDefault = access.user.name ?? "Programme Manager";
            const previewHref = `/org/${params.orgSlug}/app/certificates/preview?tenant=${encodeURIComponent(access.membership.organization.name)}&enrollmentId=${enrollment.id}&learner=${encodeURIComponent(learnerName)}&programme=${encodeURIComponent(enrollment.program.name)}&manager=${encodeURIComponent(managerDefault)}&signature=Signed%20digitally`;
            return (
              <form key={enrollment.id} action={`/api/org/${params.orgSlug}/certificates/issue`} method="post" encType="multipart/form-data" className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-7">
                <input type="hidden" name="enrollmentId" value={enrollment.id} />
                <p className="md:col-span-2">{learnerName} · {enrollment.program.name}</p>
                <input name="managerName" placeholder="Manager name" defaultValue={managerDefault} className="rounded border border-slate-300 px-2 py-1" />
                <input name="signature" placeholder="Digital signature text" defaultValue="Signed digitally" className="rounded border border-slate-300 px-2 py-1" />
                <input type="hidden" name="tenantName" value={access.membership.organization.name} />
                <input type="file" name="signatureImage" accept="image/*" className="rounded border border-slate-300 px-2 py-1 text-xs" />
                <a className="rounded border border-slate-300 px-3 py-1 text-center text-slate-700" href={previewHref}>View certificate</a>
                <button className="rounded bg-emerald-600 px-3 py-1 text-white">Save + issue PDF</button>
              </form>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Issued certificates</h2>
        <div className="mt-3 space-y-2 text-sm">
          {certificates.length === 0 ? <p className="text-slate-500">No certificates issued yet.</p> : certificates.map((doc) => {
            const learnerName = doc.user.name ?? doc.user.email;
            const enrollmentLink = latestEnrollmentByUser.get(doc.userId);
            const previewHref = `/org/${params.orgSlug}/app/certificates/preview?tenant=${encodeURIComponent(access.membership.organization.name)}${enrollmentLink ? `&enrollmentId=${enrollmentLink.id}` : ""}&learner=${encodeURIComponent(learnerName)}&programme=${encodeURIComponent(enrollmentLink?.programName ?? "Completed Programme")}&manager=${encodeURIComponent(access.user.name ?? "Programme Manager")}&signature=Signed%20digitally`;
            return (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                <p>{learnerName} · {doc.createdAt.toISOString().slice(0, 10)}</p>
                <div className="flex gap-3">
                  <a className="text-slate-700" href={previewHref}>View certificate</a>
                  <a className="text-blue-600" href={`/api/org/${params.orgSlug}/certificates/${doc.id}/download`}>Download certificate</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
