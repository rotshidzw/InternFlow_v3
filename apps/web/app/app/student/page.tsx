import { prisma } from "@internflow/db/src";

export default async function StudentPortal() {
  const user = await prisma.user.findUnique({ where: { email: "student@demo.com" } });
  if (!user) return null;
  const apps = await prisma.application.findMany({ where: { userId: user.id }, include: { checklist: { include: { items: true } }, opportunity: true } });
  const docs = await prisma.document.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  const logbook = await prisma.logbookEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 4 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Student Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4 dark:bg-slate-900">
          <h2 className="font-semibold">Applications & checklist</h2>
          {apps.map((a) => (
            <div key={a.id} className="mt-3 rounded-lg border p-3 text-sm">
              <p>{a.opportunity.title} · {a.status}</p>
              <p>{a.checklist?.items.filter((i) => i.status === "DONE").length ?? 0}/{a.checklist?.items.length ?? 0} checklist items done</p>
            </div>
          ))}
        </section>
        <section className="rounded-xl border bg-white p-4 dark:bg-slate-900">
          <h2 className="font-semibold">Upload document</h2>
          <form action="/api/documents/upload" method="post" encType="multipart/form-data" className="mt-3 space-y-2 text-sm">
            <input type="hidden" name="userId" value={user.id} />
            <select name="type" className="w-full rounded border px-2 py-1" defaultValue="ID" required>
              <option value="ID">ID</option>
              <option value="CV">CV</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="AFFIDAVIT">Affidavit</option>
              <option value="PROOF_OF_ADDRESS">Proof of address</option>
              <option value="PAYSLIP">Payslip</option>
            </select>
            <input type="file" name="file" className="w-full rounded border px-2 py-1" required />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="selfCertified" value="true" />
              Self-certified
            </label>
            <button className="rounded bg-emerald-600 px-3 py-1 text-white">Upload to MinIO</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Uploads now write to MinIO and save metadata to the document vault.</p>
        </section>
      </div>
      <section className="rounded-xl border bg-white p-4 dark:bg-slate-900">
        <h2 className="font-semibold">Logbook entries</h2>
        {logbook.map((entry) => <p key={entry.id} className="mt-2 text-sm">{entry.summary}</p>)}
      </section>
      <section className="rounded-xl border bg-white p-4 dark:bg-slate-900">
        <h2 className="font-semibold">Document Vault</h2>
        {docs.map((d) => <p key={d.id} className="mt-1 text-sm">{d.type} · {d.status} {d.rejectionReason ? `- ${d.rejectionReason}` : ""}</p>)}
      </section>
    </div>
  );
}
