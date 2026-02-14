import { prisma } from "@internflow/db/src";

export default async function SupervisorPortal() {
  const entries = await prisma.logbookEntry.findMany({ include: { user: true, approvals: true }, orderBy: { createdAt: "desc" }, take: 10 });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Supervisor Approvals</h1>
      {entries.map((e) => (
        <div key={e.id} className="rounded-xl border bg-white p-4 dark:bg-slate-900">
          <p className="text-sm">{e.user.email}</p>
          <p>{e.summary}</p>
          <form action="/api/logbook/approve" method="post" className="mt-3 flex gap-2 text-sm">
            <input type="hidden" name="entryId" value={e.id} />
            <input name="status" placeholder="APPROVED/REJECTED" className="rounded border px-2 py-1" />
            <input name="comment" placeholder="comment" className="rounded border px-2 py-1" />
            <button className="rounded bg-indigo-600 px-3 py-1 text-white">Submit</button>
          </form>
        </div>
      ))}
    </div>
  );
}
