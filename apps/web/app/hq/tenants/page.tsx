import { prisma } from "@internflow/db/src";
import Link from "next/link";

export default async function HqTenantsPage({ searchParams }: { searchParams?: { status?: string; industry?: string } }) {
  const status = searchParams?.status;
  const industry = searchParams?.industry;
  const tenants = await prisma.organization.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(industry ? { type: industry as any } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Tenants Directory</h1>
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur md:grid-cols-[220px_220px_auto]">
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING_REVIEW">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select name="industry" defaultValue={industry ?? ""} className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm">
          <option value="">All industries</option>
          <option value="COMPANY">Company</option>
          <option value="TRAINING_PROVIDER">Training Provider</option>
          <option value="NGO">NGO</option>
        </select>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Apply filters</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Industry</th><th className="px-4 py-2">Created</th><th className="px-4 py-2">Health</th></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-2"><Link className="text-blue-600 underline" href={`/hq/tenants/${t.id}`}>{t.name}</Link></td>
                <td className="px-4 py-2">{t.status}</td>
                <td className="px-4 py-2">{t.type}</td>
                <td className="px-4 py-2">{t.createdAt.toISOString().slice(0,10)}</td>
                <td className="px-4 py-2">{t.status === "APPROVED" ? 90 : t.status === "PENDING_REVIEW" ? 55 : 30}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
