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
    <div className="if-auth-page gap-5">
      <section className="if-auth-hero">
        <p className="if-kicker">Customer operations</p>
        <h1 className="if-auth-title mt-2">Meetings</h1>
        <p className="if-auth-subtitle">Schedule, track and follow up onboarding calls with tenant organizations.</p>
      </section>

      <div className="if-auth-metrics md:grid-cols-3">
        <div className="if-auth-metric"><p className="if-auth-metric-label">Today</p><p className="if-auth-metric-value">{meetingsToday.length}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Upcoming</p><p className="if-auth-metric-value">{upcoming.length}</p></div>
        <div className="if-auth-metric"><p className="if-auth-metric-label">Reminder lead time</p><p className="if-auth-metric-value">{settings?.reminderHours ?? 24}h</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="if-panel rounded-2xl p-4">
          <h2 className="if-section-title">Schedule meeting</h2>
          <form action="/api/hq/meetings" method="post" className="mt-3 grid gap-2 md:grid-cols-2">
            <input name="title" placeholder="Onboarding call" required className="rounded-lg border border-slate-300 bg-white text-brand-text px-3 py-2 text-sm" />
            <select name="orgId" required className="rounded-lg border border-slate-300 bg-white text-brand-text px-3 py-2 text-sm">{tenants.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input type="datetime-local" name="startAt" required className="rounded-lg border border-slate-300 bg-white text-brand-text px-3 py-2 text-sm" />
            <input type="datetime-local" name="endAt" required className="rounded-lg border border-slate-300 bg-white text-brand-text px-3 py-2 text-sm" />
            <input name="meetingUrl" placeholder="https://meet..." className="rounded-lg border border-slate-300 bg-white text-brand-text px-3 py-2 text-sm" />
            <input name="agenda" defaultValue={settings?.defaultAgenda ?? "Introductions; Adoption review; Next actions"} className="rounded-lg border border-slate-300 bg-white text-brand-text px-3 py-2 text-sm" />
            <textarea name="notes" placeholder="Notes" className="rounded-lg border border-slate-300 bg-white text-brand-text px-3 py-2 text-sm md:col-span-2" />
            <button className="if-btn if-btn-primary justify-center px-3 py-2 text-sm md:col-span-2">Create meeting (emails tenant contacts)</button>
          </form>
        </div>
        <WritingAssist />
      </div>

      <div className="if-panel rounded-2xl p-4">
        <h2 className="if-section-title">Calendar list</h2>

        {meetings.length === 0 && <p className="mt-3 text-sm text-brand-muted">No meetings scheduled.</p>}

        {meetings.length > 0 && (
          <div className="mt-3 space-y-3">
            {meetings.map((m) => (
              <div key={m.id} className="if-panel-muted rounded-xl p-3 transition hover:border-brand-accent/45">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-brand-text">{m.title}</p>
                    <p className="text-sm text-brand-textSoft">{m.organization.name}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(m.status)}`}>{m.status}</span>
                </div>

                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <div className="if-panel-muted rounded-lg px-3 py-2">
                    <p className="if-meta-text">Date</p>
                    <p className="font-medium text-brand-text">{fmtDate(m.startAt)}</p>
                  </div>
                  <div className="if-panel-muted rounded-lg px-3 py-2">
                    <p className="if-meta-text">Time</p>
                    <p className="font-medium text-brand-text">{fmtTime(m.startAt)} - {fmtTime(m.endAt)}</p>
                  </div>
                  <div className="if-panel-muted rounded-lg px-3 py-2">
                    <p className="if-meta-text">Meeting link</p>
                    <p className="truncate font-medium text-brand-text">{m.meetingUrl || "Not provided"}</p>
                  </div>
                </div>

                <form action={`/api/hq/meetings/${m.id}/remind`} method="post" className="mt-3">
                  <button className="if-btn if-btn-secondary px-3 py-2 text-xs font-medium">Send reminder to tenant contacts</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
