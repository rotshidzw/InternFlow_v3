import { prisma } from "@internflow/db/src";

export default async function HQMeetingsPage() {
  const [tenants, meetings] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.meeting.findMany({ include: { organization: true }, orderBy: { startAt: "asc" }, take: 50 })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Meetings</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Schedule meeting</h2>
        <form action="/api/hq/meetings" method="post" className="mt-3 grid gap-2 md:grid-cols-2">
          <input name="title" placeholder="Onboarding call" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select name="orgId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{tenants.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input type="datetime-local" name="startAt" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="datetime-local" name="endAt" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="meetingUrl" placeholder="https://meet..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="agenda" placeholder="Agenda template" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <textarea name="notes" placeholder="Notes" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white md:col-span-2">Create meeting</button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Calendar list</h2>
        {meetings.map((m) => (
          <div key={m.id} className="mt-2 rounded border border-slate-200 p-2 text-sm">
            <p>{m.title} · {m.organization.name} · {m.status}</p>
            <p className="text-slate-600">{m.startAt.toISOString()} → {m.endAt.toISOString()}</p>
            <form action={`/api/hq/meetings/${m.id}/remind`} method="post" className="mt-1"><button className="rounded border border-slate-300 px-2 py-1 text-xs">Send reminder</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
