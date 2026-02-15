import { prisma } from "@internflow/db/src";

export default async function TicketsPage() {
  const tickets = await prisma.ticket.findMany({ include: { user: true, events: true }, orderBy: { createdAt: "desc" }, take: 30 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Support tickets</h1>
      {tickets.map((ticket) => (
        <div key={ticket.id} className="rounded-xl border border-white/15 bg-white/10 p-4">
          <p className="font-semibold">{ticket.title} · {ticket.status}</p>
          <p className="text-sm text-slate-200">{ticket.user.email}</p>
          <p className="mt-2 text-sm">{ticket.summary}</p>
          <div className="mt-2 text-xs text-slate-300">{ticket.events.map((e) => e.event).join(" | ")}</div>
        </div>
      ))}
    </div>
  );
}
