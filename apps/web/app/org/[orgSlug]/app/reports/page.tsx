import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function ReportsPage({ params }: { params: { orgSlug: string } }) {
  await requireTenantAccess(params.orgSlug);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports & Exports</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Link className="rounded-xl border border-slate-200 bg-white p-3" href={`/api/org/${params.orgSlug}/exports/learners.csv`}>Learner register CSV</Link>
        <Link className="rounded-xl border border-slate-200 bg-white p-3" href={`/api/org/${params.orgSlug}/exports/stipend.csv`}>Stipend register CSV</Link>
        <Link className="rounded-xl border border-slate-200 bg-white p-3" href={`/api/org/${params.orgSlug}/exports/compliance.csv`}>Compliance summary CSV</Link>
      </div>
      <p className="text-sm text-slate-600">Compliance pack ZIP is planned; CSV exports are available now and queue-ready architecture is in place.</p>
    </div>
  );
}
