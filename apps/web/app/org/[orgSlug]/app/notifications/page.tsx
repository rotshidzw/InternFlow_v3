import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantNotificationsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const members = await prisma.membership.findMany({
    where: { organizationId: orgId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const learnerIds = members.filter((m) => m.role === "STUDENT").map((m) => m.userId);

  const notifications = learnerIds.length
    ? await prisma.notification.findMany({
        where: { userId: { in: learnerIds } },
        orderBy: { createdAt: "desc" },
        take: 80,
      })
    : [];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Notifications + reminders</h1>
        <p className="text-sm text-slate-600">
          Send learner reminders (documents, checklist, payout updates) and track recent notification activity.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Send reminder</h2>
        <form action={`/api/org/${params.orgSlug}/notifications`} method="post" className="mt-3 grid gap-2 md:grid-cols-4">
          <select name="userId" className="rounded-lg border border-slate-300 px-2 py-2 text-sm md:col-span-1">
            {members.filter((m) => m.role === "STUDENT").map((member) => (
              <option key={member.id} value={member.userId}>{member.user.name ?? member.user.email}</option>
            ))}
          </select>
          <input name="title" required defaultValue="Action required" className="rounded-lg border border-slate-300 px-2 py-2 text-sm md:col-span-1" />
          <input name="body" required placeholder="Message for learner" className="rounded-lg border border-slate-300 px-2 py-2 text-sm md:col-span-2" />
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white md:col-span-4">Send notification</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Recent notifications</h2>
        <div className="mt-3 space-y-2 text-sm">
          {notifications.length === 0 ? (
            <p className="text-slate-500">No learner notifications yet.</p>
          ) : (
            notifications.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-slate-600">{item.body}</p>
                <p className="text-xs text-slate-500">{item.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {item.readAt ? "Read" : "Unread"}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
