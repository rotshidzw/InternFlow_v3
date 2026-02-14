import { prisma } from "@internflow/db/src";

export default async function WhatsAppSimPage() {
  const threads = await prisma.chatThread.findMany({ include: { messages: true }, orderBy: { createdAt: "desc" } });
  const active = threads[0];

  return (
    <div className="grid h-[75vh] grid-cols-1 gap-3 md:grid-cols-[280px_1fr]">
      <aside className="rounded-xl border bg-white p-3 dark:bg-slate-900">
        <h2 className="font-semibold">Threads</h2>
        {threads.map((t) => <div key={t.id} className="mt-2 rounded border p-2 text-sm">{t.title}</div>)}
      </aside>
      <section className="rounded-xl border bg-white p-3 dark:bg-slate-900">
        <h2 className="font-semibold">Conversation</h2>
        <div className="mt-3 h-[55vh] space-y-2 overflow-y-auto">
          {active?.messages.map((m) => <div key={m.id} className={`max-w-md rounded-xl p-2 text-sm ${m.role === "USER" ? "ml-auto bg-emerald-100" : "bg-slate-100 dark:bg-slate-800"}`}>{m.body}</div>)}
        </div>
        <form action="/api/whatsapp/messages" method="post" className="mt-3 flex gap-2">
          <input type="hidden" name="threadId" value={active?.id} />
          <input type="text" name="body" className="flex-1 rounded border px-3 py-2" placeholder="Type message or quick action 1-5" />
          <button className="rounded bg-emerald-600 px-4 py-2 text-white">Send</button>
        </form>
      </section>
    </div>
  );
}
