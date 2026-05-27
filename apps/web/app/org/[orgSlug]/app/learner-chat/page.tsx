import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function LearnerChatPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const learners = await prisma.membership.findMany({
    where: { organizationId: orgId, role: "STUDENT" },
    include: {
      user: {
        include: {
          chatMessages: { orderBy: { createdAt: "desc" }, take: 1 }
        }
      }
    },
    take: 100,
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Coordinator learner chat</h1>
        <p className="text-sm text-slate-600">Management-side conversation panel to message learners directly from the tenant workspace.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {learners.map((membership) => (
          <div key={membership.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold">{membership.user.name ?? membership.user.email}</p>
            <p className="text-xs text-slate-500">{membership.user.email}</p>
            <p className="mt-2 text-xs text-slate-500">Latest message: {membership.user.chatMessages[0]?.body ?? "No messages yet"}</p>
            <form action={`/api/org/${params.orgSlug}/learner-chat`} method="post" className="mt-3 flex gap-2">
              <input type="hidden" name="learnerId" value={membership.user.id} />
              <input name="body" placeholder="Type message to learner" className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
                Send
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
