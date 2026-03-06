import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function RegistersPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const [programmes, registers] = await Promise.all([
    prisma.program.findMany({ where: { organizationId: access.membership.organizationId }, orderBy: { startDate: "desc" } }),
    prisma.organizationDocument.findMany({ where: { orgId: access.membership.organizationId, category: "ATTENDANCE_REGISTER" }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Registers (upload + export)</h1>
        <p className="text-sm text-slate-600">Upload attendance registers and download historical registers from one place.</p>
      </div>

      <form action={`/api/org/${params.orgSlug}/registers`} method="post" encType="multipart/form-data" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <select name="programmeId" className="rounded-lg border border-slate-300 p-2 text-sm">
          <option value="general">General register</option>
          {programmes.map((programme) => (
            <option key={programme.id} value={programme.id}>{programme.name}</option>
          ))}
        </select>
        <input type="file" name="file" required className="rounded-lg border border-slate-300 p-2 text-sm md:col-span-2" />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white md:col-span-3">Upload register</button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Uploaded registers</h2>
        <div className="mt-3 space-y-2 text-sm">
          {registers.length === 0 ? <p className="text-slate-500">No registers uploaded yet.</p> : registers.map((register) => (
            <div key={register.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
              <p>{register.fileKey.split("/").pop()} · {register.createdAt.toISOString().slice(0, 10)}</p>
              <a className="text-blue-600" href={`/api/org/${params.orgSlug}/registers/${register.id}`}>Download</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
