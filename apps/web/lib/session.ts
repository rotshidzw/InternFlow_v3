import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { getAuthenticatedEmailFromCookies } from "@/lib/auth-session";

export async function getCurrentUser() {
  const email = getAuthenticatedEmailFromCookies();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}

export function getSelectedWorkspaceSlug() {
  return cookies().get("if_workspace")?.value ?? null;
}
