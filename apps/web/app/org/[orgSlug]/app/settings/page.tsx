import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantSettingsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const branding = await prisma.settings.findFirst({
    where: { organizationId: access.membership.organizationId, key: "tenant_branding" },
  });
  const value = (branding?.value as { logoUrl?: string; primaryColor?: string; allowedDomains?: string[] } | null) ?? null;

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Administration</p>
        <h1 className="if-auth-title mt-2">Tenant settings</h1>
        <p className="if-auth-subtitle">Manage branding defaults and domain restrictions used by your workspace.</p>
      </section>

      <form action={`/api/org/${params.orgSlug}/settings`} method="post" className="if-auth-form if-filter-grid md:grid-cols-2">
        <input name="logoUrl" defaultValue={value?.logoUrl ?? ""} placeholder="Logo URL" className="rounded px-2 py-2 text-sm" />
        <input name="primaryColor" defaultValue={value?.primaryColor ?? "#8b5cf6"} placeholder="Primary color" className="rounded px-2 py-2 text-sm" />
        <input
          name="allowedDomains"
          defaultValue={(value?.allowedDomains ?? []).join(",")}
          placeholder="allowed domains comma-separated"
          className="rounded px-2 py-2 text-sm md:col-span-2"
        />
        <button className="if-btn if-btn-primary px-3 py-2 text-sm md:col-span-2">Save settings</button>
      </form>
    </div>
  );
}
