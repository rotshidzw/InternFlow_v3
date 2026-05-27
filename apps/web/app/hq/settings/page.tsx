import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";

export default async function HQSettingsPage() {
  await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_OPS"]);

  const [meetingDefaults, supportPolicy, platformPolicy] = await Promise.all([
    prisma.settings.findFirst({ where: { organizationId: null, key: "hq_meeting_defaults" } }),
    prisma.settings.findFirst({ where: { organizationId: null, key: "hq_support_policy" } }),
    prisma.settings.findFirst({ where: { organizationId: null, key: "hq_platform_policy" } })
  ]);

  const meeting = (meetingDefaults?.value as { reminderHours?: number; defaultAgenda?: string } | null) ?? null;
  const support = (supportPolicy?.value as { autoAssignSupport?: boolean; escalationHours?: number } | null) ?? null;
  const platform = (platformPolicy?.value as { allowSelfServeOnboarding?: boolean; defaultTenantStatus?: string } | null) ?? null;

  return (
    <div className="if-auth-page gap-6">
      <section className="if-auth-hero">
        <p className="if-kicker">Configuration</p>
        <h1 className="if-auth-title mt-2">HQ Settings</h1>
        <p className="if-auth-subtitle">Configure platform operations, support workflows, and onboarding defaults for InternFlow HQ.</p>
      </section>

      <form action="/api/hq/settings" method="post" className="space-y-4">
        <div className="if-panel rounded-2xl p-5">
          <h2 className="if-section-title">Meetings workspace</h2>
          <p className="mt-1 text-sm text-brand-textSoft">Default reminders and agenda used when scheduling tenant meetings.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-brand-muted">Reminder lead time (hours)</span>
              <input name="meetingReminderHours" type="number" min={1} max={168} defaultValue={meeting?.reminderHours ?? 24} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-brand-muted">Default agenda template</span>
              <textarea name="defaultAgenda" rows={4} defaultValue={meeting?.defaultAgenda ?? "Introductions\nAdoption review\nOpen risks\nNext actions"} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </label>
          </div>
        </div>

        <div className="if-panel rounded-2xl p-5">
          <h2 className="if-section-title">Support operations</h2>
          <p className="mt-1 text-sm text-brand-textSoft">Define queue ownership and escalation timing for support tickets.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-brand-textSoft">
              <input name="autoAssignSupport" type="checkbox" defaultChecked={support?.autoAssignSupport ?? true} />
              <span>Auto-assign new tickets to support queue</span>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-brand-muted">Escalate to Ops after (hours)</span>
              <input name="escalationHours" type="number" min={1} max={168} defaultValue={support?.escalationHours ?? 24} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </label>
          </div>
        </div>

        <div className="if-panel rounded-2xl p-5">
          <h2 className="if-section-title">Platform onboarding policy</h2>
          <p className="mt-1 text-sm text-brand-textSoft">Control tenant onboarding and default review status for new organizations.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-brand-textSoft">
              <input name="allowSelfServeOnboarding" type="checkbox" defaultChecked={platform?.allowSelfServeOnboarding ?? true} />
              <span>Allow self-serve organization onboarding</span>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-brand-muted">Default tenant status</span>
              <select name="defaultTenantStatus" defaultValue={platform?.defaultTenantStatus ?? "PENDING_REVIEW"} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="PENDING_REVIEW">Pending review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
          </div>
        </div>

        <button className="if-btn if-btn-primary px-4 py-2 text-sm font-medium">Save all settings</button>
      </form>
    </div>
  );
}
