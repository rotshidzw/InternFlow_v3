import { prisma } from "@internflow/db/src";

export default async function CoordinatorPortal() {
  const pendingDocs = await prisma.document.count({ where: { status: "PENDING" } });
  const failedDocs = await prisma.document.count({ where: { status: "FAIL" } });
  const tickets = await prisma.ticket.findMany({ include: { user: true }, take: 10, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Coordinator Compliance Hub</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-3 dark:bg-slate-900">Pending docs: {pendingDocs}</div>
        <div className="rounded-xl border bg-white p-3 dark:bg-slate-900">Rejected docs: {failedDocs}</div>
        <div className="rounded-xl border bg-white p-3 dark:bg-slate-900">One-click: Request missing docs</div>
        <div className="rounded-xl border bg-white p-3 dark:bg-slate-900">One-click: Mark stipend paid</div>
      </div>
      <section className="rounded-xl border bg-white p-4 dark:bg-slate-900">
        <h2 className="font-semibold">Tickets & WhatsApp escalations</h2>
        {tickets.map((t) => <p key={t.id} className="mt-2 text-sm">{t.user.email}: {t.title} [{t.status}]</p>)}
      </section>
    </div>
  );
}
