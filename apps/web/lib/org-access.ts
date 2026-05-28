import { prisma } from "@internflow/db/src";
import { getAuthenticatedEmailFromCookies } from "@/lib/auth-session";

export async function getOrgAccess(orgSlug: string) {
  const email = getAuthenticatedEmailFromCookies();
  if (!email) return { error: "unauthenticated" as const };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "unauthenticated" as const };

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: orgSlug } },
    include: { organization: true }
  });

  if (!membership) return { error: "forbidden" as const };
  if (membership.organization.status !== "APPROVED") return { error: "pending" as const, membership };

  return { user, membership };
}
