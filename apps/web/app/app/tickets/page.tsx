import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ArrowLeft, LifeBuoy, Mail, TimerReset, TriangleAlert } from "lucide-react";

function formatDate(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function statusClass(status: string) {
  if (status === "RESOLVED") return "if-status if-status-completed";
  if (status === "IN_PROGRESS") return "if-status if-status-warning";
  if (status === "OPEN") return "if-status if-status-pending";
  return "if-status if-status-draft";
}

export default async function TicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const platformMembership = await prisma.platformMembership.findFirst({
    where: { userId: user.id },
  });
  if (!platformMembership) redirect("/app/student");

  const tickets = await prisma.ticket.findMany({
    include: { user: true, events: { orderBy: { createdAt: "desc" }, take: 8 } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const activeCount = tickets.filter((ticket) =>
    ["OPEN", "IN_PROGRESS"].includes(ticket.status),
  ).length;
  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "RESOLVED",
  ).length;
  const urgentCount = tickets.filter((ticket) => ticket.priority === "URGENT").length;
  const eventCount = tickets.reduce((total, ticket) => total + ticket.events.length, 0);

  return (
    <div className="if-auth-page min-h-[calc(100vh-7rem)] space-y-4 p-4 md:p-6">
      <section className="if-auth-hero p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">
              Support Operations
            </p>
            <h1 className="if-auth-title">Support tickets</h1>
            <p className="if-auth-subtitle max-w-2xl">
              Review incident threads from student chat, contact requests, and onboarding escalations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/whatsapp-sim" className="if-btn if-btn-secondary if-btn-nav text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Student support thread
            </Link>
            <Link href="/hq/support" className="if-btn if-btn-primary if-btn-nav text-xs">
              <LifeBuoy className="h-3.5 w-3.5" />
              Open HQ support queue
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="if-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.13em] text-brand-muted">
            Active tickets
          </p>
          <p className="mt-2 text-2xl font-semibold text-brand-text">{activeCount}</p>
          <p className="mt-1 text-xs text-brand-muted">OPEN + IN_PROGRESS</p>
        </article>
        <article className="if-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.13em] text-brand-muted">
            Resolved
          </p>
          <p className="mt-2 text-2xl font-semibold text-brand-text">{resolvedCount}</p>
          <p className="mt-1 text-xs text-brand-muted">Closed investigations</p>
        </article>
        <article className="if-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.13em] text-brand-muted">
            Urgent
          </p>
          <p className="mt-2 text-2xl font-semibold text-brand-text">{urgentCount}</p>
          <p className="mt-1 text-xs text-brand-muted">Priority escalations</p>
        </article>
        <article className="if-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.13em] text-brand-muted">
            Event entries
          </p>
          <p className="mt-2 text-2xl font-semibold text-brand-text">{eventCount}</p>
          <p className="mt-1 text-xs text-brand-muted">Tracked timeline updates</p>
        </article>
      </section>

      <section className="if-panel rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-brand-text">Ticket feed</h2>
          <span className="if-status if-status-draft">{tickets.length} records</span>
        </div>

        <div className="mt-4 space-y-3">
          {tickets.length === 0 ? (
            <div className="if-panel-muted rounded-xl border border-brand-border/60 p-4 text-sm text-brand-muted">
              No support tickets found yet.
            </div>
          ) : (
            tickets.map((ticket) => (
              <article
                key={ticket.id}
                className="if-panel-muted rounded-xl border border-brand-border/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-brand-text">{ticket.title}</p>
                    <p className="text-xs text-brand-muted">
                      Ticket ID: {ticket.id} - Created: {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={statusClass(ticket.status)}>{ticket.status}</span>
                    <span className="if-status if-status-draft">
                      {ticket.priority}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-brand-textSoft sm:grid-cols-2">
                  <p className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-brand-accentStrong" />
                    {ticket.user.email}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <TimerReset className="h-3.5 w-3.5 text-brand-accentStrong" />
                    Updated: {formatDate(ticket.events[0]?.createdAt ?? ticket.createdAt)}
                  </p>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-brand-textSoft">
                  {ticket.summary}
                </p>

                <div className="mt-3 rounded-lg border border-brand-border/55 bg-[#0c1634] p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-accentStrong">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    Activity timeline
                  </p>
                  <div className="mt-2 space-y-1.5 text-xs text-brand-textSoft">
                    {ticket.events.length === 0 ? (
                      <p className="text-brand-muted">No timeline events recorded yet.</p>
                    ) : (
                      ticket.events.map((event) => (
                        <p key={event.id}>
                          {formatDate(event.createdAt)} - {event.event}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
