import { prisma } from "@internflow/db/src";

export default async function HQSettingsPage() {
  const defaults = await prisma.settings.findFirst({ where: { organizationId: null, key: "hq_meeting_defaults" } });
  const value = (defaults?.value as { reminderHours?: number; defaultAgenda?: string } | null) ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">HQ Settings</h1>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold">Meeting defaults</h2>
        <p className="mt-1 text-sm text-slate-600">Configure default reminder timing and agenda template used by the meetings workspace.</p>

        <form action="/api/hq/settings" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Reminder lead time (hours)</span>
            <input name="meetingReminderHours" type="number" min={1} max={168} defaultValue={value?.reminderHours ?? 24} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-slate-600">Default agenda template</span>
            <textarea name="defaultAgenda" rows={4} defaultValue={value?.defaultAgenda ?? "Introductions\nAdoption review\nOpen risks\nNext actions"} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>

          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white md:col-span-2">Save settings</button>
        </form>
      </div>
    </div>
  );
}
