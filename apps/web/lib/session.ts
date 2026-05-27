import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";

export async function getCurrentUser() {
  const cookieStore = cookies();
  const email = cookieStore.get("if_user")?.value;
  if (!email) return null;
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export function getSelectedWorkspaceSlug() {
  return cookies().get("if_workspace")?.value ?? null;
}
