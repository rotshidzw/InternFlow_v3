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
              <Link className="rounded-xl border border-slate-200 bg-white p-3" href={`/org/${params.orgSlug}/app/reports/exports`}>Programme close-out exports</Link>
      </div>
      <p className="text-sm text-slate-600">Build funder-ready close-out ZIP evidence packs from the Exports page.</p>
    </div>
  );
}
