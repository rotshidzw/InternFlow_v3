import { TenantShell } from "@/components/tenant/tenant-shell";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TenantAppLayout({ children, params }: { children: React.ReactNode; params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  return <TenantShell orgSlug={params.orgSlug} orgName={access.membership.organization.name} role={access.membership.role}>{children}</TenantShell>;
}
