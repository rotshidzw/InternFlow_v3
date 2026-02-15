import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantSettingsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const branding = await prisma.settings.findFirst({ where: { organizationId: access.membership.organizationId, key: "tenant_branding" } });
  const value = (branding?.value as { logoUrl?: string; primaryColor?: string; allowedDomains?: string[] } | null) ?? null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tenant Settings</h1>
      <form action={`/api/org/${params.orgSlug}/settings`} method="post" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2">
        <input name="logoUrl" defaultValue={value?.logoUrl ?? ""} placeholder="Logo URL" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        <input name="primaryColor" defaultValue={value?.primaryColor ?? "#0f766e"} placeholder="Primary color" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        <input name="allowedDomains" defaultValue={(value?.allowedDomains ?? []).join(",")} placeholder="allowed domains comma-separated" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2" />
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white md:col-span-2">Save settings</button>
      </form>
    </div>
  );
}
