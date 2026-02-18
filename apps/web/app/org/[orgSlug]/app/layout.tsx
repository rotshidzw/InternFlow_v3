import { redirect } from "next/navigation";
import { TenantShell } from "@/components/tenant/tenant-shell";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { tenantRoleHome } from "@/lib/tenant-rbac";

export default async function TenantAppLayout({ children, params }: { children: React.ReactNode; params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);

  if (access.membership.role === "STUDENT") {
    redirect(tenantRoleHome(params.orgSlug, access.membership.role));
  }

  return <TenantShell orgSlug={params.orgSlug} orgName={access.membership.organization.name} role={access.membership.role}>{children}</TenantShell>;
}
