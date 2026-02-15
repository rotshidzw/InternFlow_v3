import { prisma } from "@internflow/db/src";

export default async function HQApprovalsPage() {
  const pending = await prisma.organizationVerification.findMany({ where: { status: "PENDING" }, include: { organization: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Approvals</h1>
      {pending.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No pending approvals.</div>}
      {pending.map((verification) => (
        <div key={verification.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-semibold">{verification.organization.name}</p>
          <p className="text-sm text-slate-600">Submitted: {verification.createdAt.toISOString()}</p>
          <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(verification.docsJson, null, 2)}</pre>
          <div className="mt-3 flex gap-2">
            <form action={`/api/hq/approvals/${verification.id}`} method="post"><input type="hidden" name="decision" value="APPROVED" /><button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">Approve</button></form>
            <form action={`/api/hq/approvals/${verification.id}`} method="post" className="flex gap-2"><input type="hidden" name="decision" value="REJECTED" /><input name="reason" placeholder="Reason" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" /><button className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-600">Reject</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
