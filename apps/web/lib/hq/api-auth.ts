import { prisma } from "@internflow/db/src";
import type { PlatformRole } from "@prisma/client";
import { getAuthenticatedEmailFromCookies } from "@/lib/auth-session";

export async function requirePlatformApiUser() {
  const email = getAuthenticatedEmailFromCookies();
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const membership = await prisma.platformMembership.findFirst({ where: { userId: user.id } });
  if (!membership) return null;
  return { user, membership };
}

export async function requirePlatformApiUserWithRole(allowedRoles: PlatformRole[]) {
  const actor = await requirePlatformApiUser();
  if (!actor) return null;
  if (!allowedRoles.includes(actor.membership.role as PlatformRole)) return null;
  return actor;
}
