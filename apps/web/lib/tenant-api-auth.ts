import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export async function requireTenantApiActor(orgSlug: string, allowedRoles?: Role[]) {
  const email = cookies().get("if_user")?.value;
  if (!email) return null;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: orgSlug } },
    include: { organization: true },
  });

  if (!membership) return null;
  if (membership.organization.status !== "APPROVED") return null;
  if (allowedRoles && !allowedRoles.includes(membership.role)) return null;

  return { user, membership };
}
