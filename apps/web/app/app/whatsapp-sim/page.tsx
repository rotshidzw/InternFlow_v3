import { prisma } from "@internflow/db/src";

const actions = [
  { value: "status", label: "Check status" },
  { value: "upload", label: "Upload document" },
  { value: "payslip", label: "Request payslip" },
  { value: "certificate", label: "Request certificate" },
  { value: "support", label: "Open support ticket" }
];

export default async function WhatsAppSimPage() {
  const threads = await prisma.chatThread.findMany({ include: { messages: true }, orderBy: { createdAt: "desc" } });
  const active = threads[0];

  return (
    <div className="grid h-[75vh] grid-cols-1 gap-3 md:grid-cols-[280px_1fr]">
      <aside className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
        <h2 className="font-semibold">Threads</h2>
        {threads.map((t) => <div key={t.id} className="mt-2 rounded border border-white/10 p-2 text-sm">{t.title}</div>)}
      </aside>
      <section className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
        <h2 className="font-semibold">Conversation</h2>
        <div className="mt-3 h-[48vh] space-y-2 overflow-y-auto">
          {active?.messages.map((m) => <div key={m.id} className={`max-w-md rounded-xl p-2 text-sm ${m.role === "USER" ? "ml-auto bg-emerald-200 text-slate-900" : "bg-slate-100 text-slate-900"}`}>{m.body}</div>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <form key={action.value} action="/api/whatsapp/messages" method="post">
              <input type="hidden" name="threadId" value={active?.id} />
              <input type="hidden" name="body" value={action.value} />
              <button className="w-full rounded border border-white/20 px-3 py-2 text-sm">{action.label}</button>
            </form>
          ))}
        </div>
        <form action="/api/whatsapp/messages" method="post" className="mt-3 flex gap-2">
          <input type="hidden" name="threadId" value={active?.id} />
          <input type="text" name="body" className="flex-1 rounded border border-white/20 bg-slate-950/40 px-3 py-2" placeholder="Type custom message" />
          <button className="rounded bg-emerald-600 px-4 py-2 text-white">Send</button>
        </form>
      </section>
    </div>
  );
}
