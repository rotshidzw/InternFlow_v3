import { prisma } from "@internflow/db/src";
import { WritingAssist } from "@/components/hq/writing-assist";

export default async function HQMeetingsPage() {
  const [tenants, meetings, defaults] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.meeting.findMany({ include: { organization: true }, orderBy: { startAt: "asc" }, take: 50 }),
    prisma.settings.findFirst({ where: { organizationId: null, key: "hq_meeting_defaults" } })
  ]);
  const settings = (defaults?.value as { reminderHours?: number; defaultAgenda?: string } | null) ?? null;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Meetings</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <h2 className="font-semibold">Schedule meeting</h2>
          <form action="/api/hq/meetings" method="post" className="mt-3 grid gap-2 md:grid-cols-2">
            <input name="title" placeholder="Onboarding call" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select name="orgId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{tenants.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input type="datetime-local" name="startAt" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input type="datetime-local" name="endAt" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="meetingUrl" placeholder="https://meet..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="agenda" defaultValue={settings?.defaultAgenda ?? "Introductions; Adoption review; Next actions"} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <textarea name="notes" placeholder="Notes" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white md:col-span-2">Create meeting (emails tenant contacts)</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Default reminder lead time: {settings?.reminderHours ?? 24} hours.</p>
        </div>
        <WritingAssist />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="font-semibold">Calendar list</h2>
        {meetings.map((m) => (
          <div key={m.id} className="mt-2 rounded border border-slate-200 bg-white p-2 text-sm">
            <p>{m.title} · {m.organization.name} · {m.status}</p>
            <p className="text-slate-600">{m.startAt.toISOString()} → {m.endAt.toISOString()}</p>
            <form action={`/api/hq/meetings/${m.id}/remind`} method="post" className="mt-1"><button className="rounded border border-slate-300 px-2 py-1 text-xs">Send reminder to tenant contacts</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
