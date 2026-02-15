import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function ApplicantsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const applications = await prisma.application.findMany({ where: { opportunity: { organizationId: access.membership.organizationId } }, include: { user: true, opportunity: true }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Applicants Pipeline</h1>
      <div className="space-y-2">
        {applications.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">{a.user.email} · {a.opportunity.title}</p>
            <p className="text-slate-600">Status: {a.status}</p>
            <div className="mt-2 flex gap-2">
              <form action={`/api/applications/${a.id}/status`} method="post" className="flex gap-2"><input type="hidden" name="status" value="SHORTLISTED" /><button className="rounded border border-slate-300 px-2 py-1 text-xs">Shortlist</button></form>
              <form action={`/api/applications/${a.id}/status`} method="post" className="flex gap-2"><input type="hidden" name="status" value="ACCEPTED" /><button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Accept</button></form>
              <form action={`/api/applications/${a.id}/status`} method="post" className="flex gap-2"><input type="hidden" name="status" value="REJECTED" /><button className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700">Reject</button></form>
              <Link href={`/org/${params.orgSlug}/app/learners/${a.userId}`} className="rounded border border-slate-300 px-2 py-1 text-xs">Learner profile</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
