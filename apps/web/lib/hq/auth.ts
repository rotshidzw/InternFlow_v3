import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requirePlatformAccess() {
  const email = cookies().get("if_user")?.value;
  if (!email) redirect("/auth");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/auth");

  const membership = await prisma.platformMembership.findFirst({ where: { userId: user.id } });
  if (!membership) redirect("/workspaces");

  return { user, platformMembership: membership };
}
