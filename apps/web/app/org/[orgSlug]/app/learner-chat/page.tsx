import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

const tenantResponderRoles = new Set([
  "COORDINATOR",
  "PROVIDER_ADMIN",
  "SUPERVISOR",
  "SYSTEM_ADMIN",
  "TRAINER",
  "FACILITATOR",
  "FINANCE",
  "PAYROLL",
  "AUDITOR",
  "READ_ONLY",
]);

function formatTimestamp(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function messageState(latestRole: string | null) {
  if (!latestRole) {
    return {
      label: "No conversation yet",
      className: "if-status if-status-draft",
    };
  }
  if (latestRole === "USER") {
    return {
      label: "Awaiting coordinator response",
      className: "if-status if-status-warning",
    };
  }
  if (tenantResponderRoles.has(latestRole)) {
    return {
      label: "Awaiting learner response",
      className: "if-status if-status-pending",
    };
  }
  return {
    label: "System thread",
    className: "if-status if-status-draft",
  };
}

export default async function LearnerChatPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const learners = await prisma.membership.findMany({
    where: { organizationId: orgId, role: "STUDENT" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const learnerIds = learners.map((membership) => membership.user.id);
  const [threads, unreadNotificationCounts] = await Promise.all([
    learnerIds.length
      ? prisma.chatThread.findMany({
          where: { userId: { in: learnerIds } },
          include: {
            messages: { orderBy: { createdAt: "desc" }, take: 4 },
            _count: { select: { messages: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    learnerIds.length
      ? prisma.notification.groupBy({
          by: ["userId"],
          where: { userId: { in: learnerIds }, readAt: null },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const threadByLearner = new Map(threads.map((thread) => [thread.userId, thread]));
  const unreadByLearner = new Map(
    unreadNotificationCounts.map((row) => [row.userId, row._count._all]),
  );

  const rows = learners.map((membership) => {
    const thread = threadByLearner.get(membership.user.id) ?? null;
    const latestMessage = thread?.messages[0] ?? null;
    const unread = unreadByLearner.get(membership.user.id) ?? 0;
    return {
      learnerId: membership.user.id,
      learnerName: membership.user.name ?? membership.user.email,
      learnerEmail: membership.user.email,
      thread,
      latestMessage,
      unread,
    };
  });

  const activeThreads = rows.filter((row) => (row.thread?._count.messages ?? 0) > 0).length;
  const needsCoordinatorReply = rows.filter((row) => row.latestMessage?.role === "USER").length;
  const awaitingLearner = rows.filter((row) =>
    row.latestMessage ? tenantResponderRoles.has(row.latestMessage.role) : false,
  ).length;
  const unreadAlerts = rows.reduce((sum, row) => sum + row.unread, 0);

  return (
    <div className="if-auth-page gap-4">
      <section className="if-auth-hero">
        <p className="if-marketing-eyebrow text-brand-accentStrong">Communication Desk</p>
        <h1 className="if-auth-title mt-2">Learner messaging workspace</h1>
        <p className="if-auth-subtitle">
          Coordinate learner conversations, surface pending responses, and keep support requests
          visible for follow-through.
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Learners</p>
          <p className="if-auth-metric-value">{rows.length}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Active threads</p>
          <p className="if-auth-metric-value">{activeThreads}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Need coordinator reply</p>
          <p className="if-auth-metric-value">{needsCoordinatorReply}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Awaiting learner</p>
          <p className="if-auth-metric-value">{awaitingLearner}</p>
        </article>
        <article className="if-auth-metric">
          <p className="if-auth-metric-label">Unread learner alerts</p>
          <p className="if-auth-metric-value">{unreadAlerts}</p>
        </article>
      </section>

      <section className="if-panel rounded-2xl p-4">
        <h2 className="if-panel-title">Conversation inbox</h2>
        <p className="if-panel-copy mt-1">
          Each learner card shows latest conversation state, recent message context, and quick
          response controls.
        </p>

        {rows.length === 0 ? (
          <p className="if-empty-state mt-3 text-sm">
            No learner memberships found for this workspace yet.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {rows.map((row) => {
              const state = messageState(row.latestMessage?.role ?? null);
              return (
                <article key={row.learnerId} className="if-panel-muted rounded-xl p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="if-card-title">{row.learnerName}</p>
                      <p className="if-caption-text">{row.learnerEmail}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={state.className}>{state.label}</span>
                      {row.unread > 0 ? (
                        <span className="if-status if-status-warning">
                          Unread alerts: {row.unread}
                        </span>
                      ) : (
                        <span className="if-status if-status-success">No unread alerts</span>
                      )}
                    </div>
                  </div>

                  <p className="if-caption-text mt-2">
                    Messages in thread: {row.thread?._count.messages ?? 0}
                  </p>

                  <div className="mt-2 space-y-1">
                    {(row.thread?.messages ?? []).length === 0 ? (
                      <p className="if-empty-state text-xs">No messages yet.</p>
                    ) : (
                      row.thread?.messages.slice(0, 3).map((message) => (
                        <div key={message.id} className="rounded-lg border border-brand-border/45 bg-[#0a132d]/64 px-2 py-1.5">
                          <p className="if-caption-text">
                            {message.role} | {formatTimestamp(message.createdAt)} UTC
                          </p>
                          <p className="if-body-text mt-0.5">{message.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form action={`/api/org/${params.orgSlug}/learner-chat`} method="post" className="mt-3 flex gap-2">
                    <input type="hidden" name="learnerId" value={row.learnerId} />
                    <input
                      name="body"
                      placeholder="Type message to learner"
                      className="h-10 flex-1 rounded px-3 text-sm"
                    />
                    <button className="if-btn if-btn-primary h-10 px-3 text-sm">
                      Send
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
