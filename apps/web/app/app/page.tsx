import { redirect } from "next/navigation";
import { getCurrentUser, getSelectedWorkspaceSlug } from "@/lib/session";
import { prisma } from "@internflow/db/src";

export default async function AppEntry() {
  const workspace = getSelectedWorkspaceSlug();
  if (!workspace) redirect("/workspaces");

  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const membership = await prisma.membership.findFirst({ where: { userId: user.id, organization: { slug: workspace } } });
  if (!membership) redirect("/workspaces");

  if (membership.role === "STUDENT") redirect("/app/student");
  redirect(`/org/${workspace}/app`);
}
