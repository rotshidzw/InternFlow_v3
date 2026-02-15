import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";
import { WritingAssist } from "@/components/hq/writing-assist";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(d);
}

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function statusTone(status: string) {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "CANCELLED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

export default async function HQMeetingsPage() {
  await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_OPS"]);

  const [tenants, meetings, defaults] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.meeting.findMany({ include: { organization: true }, orderBy: { startAt: "asc" }, take: 50 }),
    prisma.settings.findFirst({ where: { organizationId: null, key: "hq_meeting_defaults" } })
  ]);
  const settings = (defaults?.value as { reminderHours?: number; defaultAgenda?: string } | null) ?? null;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const meetingsToday = meetings.filter((m) => m.startAt >= todayStart && m.startAt < tomorrowStart);
  const upcoming = meetings.filter((m) => m.startAt >= tomorrowStart);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-white to-slate-50 p-5 shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight">Meetings</h1>
        <p className="mt-1 text-sm text-slate-600">Schedule, track and follow up onboarding calls with tenant organizations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"><p className="text-xs text-slate-500">Today</p><p className="mt-1 text-2xl font-semibold">{meetingsToday.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"><p className="text-xs text-slate-500">Upcoming</p><p className="mt-1 text-2xl font-semibold">{upcoming.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"><p className="text-xs text-slate-500">Reminder lead time</p><p className="mt-1 text-2xl font-semibold">{settings?.reminderHours ?? 24}h</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
          <h2 className="font-semibold">Schedule meeting</h2>
          <form action="/api/hq/meetings" method="post" className="mt-3 grid gap-2 md:grid-cols-2">
            <input name="title" placeholder="Onboarding call" required className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm" />
            <select name="orgId" required className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm">{tenants.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input type="datetime-local" name="startAt" required className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm" />
            <input type="datetime-local" name="endAt" required className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm" />
            <input name="meetingUrl" placeholder="https://meet..." className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm" />
            <input name="agenda" defaultValue={settings?.defaultAgenda ?? "Introductions; Adoption review; Next actions"} className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm" />
            <textarea name="notes" placeholder="Notes" className="rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white md:col-span-2">Create meeting (emails tenant contacts)</button>
          </form>
        </div>
        <WritingAssist />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
        <h2 className="font-semibold">Calendar list</h2>

        {meetings.length === 0 && <p className="mt-3 text-sm text-slate-500">No meetings scheduled.</p>}

        {meetings.length > 0 && (
          <div className="mt-3 space-y-3">
            {meetings.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold tracking-tight">{m.title}</p>
                    <p className="text-sm text-slate-600">{m.organization.name}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(m.status)}`}>{m.status}</span>
                </div>

                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="font-medium">{fmtDate(m.startAt)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Time</p>
                    <p className="font-medium">{fmtTime(m.startAt)} → {fmtTime(m.endAt)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Meeting link</p>
                    <p className="truncate font-medium">{m.meetingUrl || "Not provided"}</p>
                  </div>
                </div>

                <form action={`/api/hq/meetings/${m.id}/remind`} method="post" className="mt-3">
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-50">Send reminder to tenant contacts</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
