import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function CertificatesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);

  const [completedEnrollments, certificates] = await Promise.all([
    prisma.enrollment.findMany({
      where: { organizationId: access.membership.organizationId, status: "COMPLETED" },
      include: { user: true, program: true },
      take: 100
    }),
    prisma.document.findMany({
      where: { organizationId: access.membership.organizationId, type: "CERTIFICATE" },
      include: { user: true, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Certificate issue + signed PDF</h1>
        <p className="text-sm text-slate-600">Issue a certificate in one click for completed learners and include manager signature details.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Issue certificate</h2>
        <div className="mt-3 space-y-3 text-sm">
          {completedEnrollments.length === 0 ? <p className="text-slate-500">No completed enrollments yet.</p> : completedEnrollments.map((enrollment) => (
            <form key={enrollment.id} action={`/api/org/${params.orgSlug}/certificates/issue`} method="post" className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-5">
              <input type="hidden" name="enrollmentId" value={enrollment.id} />
              <p className="md:col-span-2">{enrollment.user.name ?? enrollment.user.email} · {enrollment.program.name}</p>
              <input name="managerName" placeholder="Manager name" className="rounded border border-slate-300 px-2 py-1" />
              <input name="signature" placeholder="Digital signature text" className="rounded border border-slate-300 px-2 py-1" />
              <button className="rounded bg-emerald-600 px-3 py-1 text-white">Issue PDF</button>
            </form>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Issued certificates</h2>
        <div className="mt-3 space-y-2 text-sm">
          {certificates.length === 0 ? <p className="text-slate-500">No certificates issued yet.</p> : certificates.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <p>{doc.user.name ?? doc.user.email} · {doc.createdAt.toISOString().slice(0, 10)}</p>
              <a className="text-blue-600" href={`/api/org/${params.orgSlug}/certificates/${doc.id}/download`}>Download certificate</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
