import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PlatformRole } from "@prisma/client";

export async function requirePlatformAccess(allowedRoles?: PlatformRole[]) {
  const email = cookies().get("if_user")?.value;
  if (!email) redirect("/auth");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/auth");

  const membership = await prisma.platformMembership.findFirst({ where: { userId: user.id } });
  if (!membership) redirect("/workspaces");

  if (allowedRoles && !allowedRoles.includes(membership.role as PlatformRole)) {
    redirect("/hq/dashboard");
  }

  return { user, platformMembership: membership };
}
