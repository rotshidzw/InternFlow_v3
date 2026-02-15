import { prisma } from "@internflow/db/src";

const TENANT_CONTACT_ROLES = ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] as const;

export async function getTenantContactEmails(orgId: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId: orgId, role: { in: [...TENANT_CONTACT_ROLES] } },
    include: { user: true }
  });

  const emails = memberships.map((m) => m.user.email).filter(Boolean);
  return [...new Set(emails)];
}
