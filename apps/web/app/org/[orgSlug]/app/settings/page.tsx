import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

const CAN_MANAGE_SETTINGS = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);
const CAN_CREATE_TICKETS = new Set(["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"]);

type SettingsSearchParams = {
  saved?: string;
  ticket?: string;
  error?: string;
};

export default async function TenantSettingsPage({
  params,
  searchParams
}: {
  params: { orgSlug: string };
  searchParams?: SettingsSearchParams;
}) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;
  const canManageSettings = CAN_MANAGE_SETTINGS.has(access.membership.role);
  const canCreateTickets = CAN_CREATE_TICKETS.has(access.membership.role);

  const [branding, recentTickets] = await Promise.all([
    prisma.settings.findFirst({ where: { organizationId: orgId, key: "tenant_branding" } }),
    prisma.ticket.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { events: { orderBy: { createdAt: "desc" }, take: 1 } }
    })
  ]);

  const value = (branding?.value as { logoUrl?: string; primaryColor?: string; allowedDomains?: string[] } | null) ?? null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Tenant Settings</h1>
        <p className="text-sm text-slate-600">Manage workspace branding, domain policy, and communicate issues directly with HQ support.</p>
      </div>

      {searchParams?.saved === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Settings saved successfully.</div>
      )}
      {searchParams?.ticket === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Support ticket submitted to HQ.</div>
      )}
      {(searchParams?.error === "forbidden" || searchParams?.error === "invalid-ticket") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {searchParams?.error === "forbidden"
            ? "You do not have permission for this settings action."
            : "Please complete ticket title/summary and choose valid category + priority."}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your role</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{access.membership.role}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Domains configured</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{value?.allowedDomains?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Tickets to HQ</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{recentTickets.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Settings access</p>
          <p className="mt-1 text-lg font-semibold text-emerald-800">{canManageSettings ? "Enabled" : "Read-only"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2">
          <p className="text-sm font-semibold text-slate-900">Branding & Access Policy</p>
          <p className="text-xs text-slate-500">Provider admins and coordinators can update tenant branding and allowed email domains.</p>
        </div>

        <form action={`/api/org/${params.orgSlug}/settings`} method="post" className="grid gap-2 md:grid-cols-2">
          <input
            name="logoUrl"
            defaultValue={value?.logoUrl ?? ""}
            placeholder="Logo URL"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            disabled={!canManageSettings}
          />
          <input
            name="primaryColor"
            defaultValue={value?.primaryColor ?? "#0f766e"}
            placeholder="Primary color"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            disabled={!canManageSettings}
          />
          <input
            name="allowedDomains"
            defaultValue={(value?.allowedDomains ?? []).join(",")}
            placeholder="allowed domains comma-separated"
            className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2"
            disabled={!canManageSettings}
          />
          <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" disabled={!canManageSettings}>
            Save settings
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2">
          <p className="text-sm font-semibold text-slate-900">Tenant ↔ HQ Support</p>
          <p className="text-xs text-slate-500">Create a support ticket for platform issues, document review blockers, or onboarding help.</p>
        </div>

        <form action={`/api/org/${params.orgSlug}/support/tickets`} method="post" className="grid gap-2 md:grid-cols-2">
          <input name="title" placeholder="Ticket title" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2" required disabled={!canCreateTickets} />
          <select name="category" className="rounded border border-slate-300 px-2 py-2 text-sm" defaultValue="TECHNICAL" disabled={!canCreateTickets}>
            <option value="GENERAL">GENERAL</option>
            <option value="BILLING">BILLING</option>
            <option value="TECHNICAL">TECHNICAL</option>
            <option value="ONBOARDING">ONBOARDING</option>
          </select>
          <select name="priority" className="rounded border border-slate-300 px-2 py-2 text-sm" defaultValue="MEDIUM" disabled={!canCreateTickets}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <textarea
            name="summary"
            placeholder="Describe the issue and what has already been tried."
            className="min-h-[96px] rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2"
            required
            disabled={!canCreateTickets}
          />
          <button className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" disabled={!canCreateTickets}>
            Submit ticket to HQ
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Recent HQ tickets</p>
        <div className="mt-2 space-y-2">
          {recentTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">{ticket.title}</p>
              <p className="text-xs text-slate-600">{ticket.status} · {ticket.priority} · {ticket.category}</p>
              <p className="text-xs text-slate-500">Created: {ticket.createdAt.toISOString().slice(0, 10)}{ticket.events[0] ? ` · Latest: ${ticket.events[0].event}` : ""}</p>
            </div>
          ))}
          {recentTickets.length === 0 && <p className="text-xs text-slate-500">No HQ tickets created yet for this tenant.</p>}
        </div>
      </div>
    </div>
  );
}
