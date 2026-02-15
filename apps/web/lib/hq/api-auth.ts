import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";

export async function requirePlatformApiUser() {
  const email = cookies().get("if_user")?.value;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const membership = await prisma.platformMembership.findFirst({ where: { userId: user.id } });
  if (!membership) return null;
  return { user, membership };
}
