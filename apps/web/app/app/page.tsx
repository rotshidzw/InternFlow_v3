import { redirect } from "next/navigation";
import { getSelectedWorkspaceSlug } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@internflow/db/src";

export default async function AppEntry() {
  const workspace = getSelectedWorkspaceSlug();
  if (!workspace) redirect("/workspaces");

  const email = cookies().get("if_user")?.value;
  if (!email) redirect("/auth");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/auth");

  const membership = await prisma.membership.findFirst({ where: { userId: user.id, organization: { slug: workspace } } });
  if (!membership) redirect("/workspaces");

  if (membership.role === "STUDENT") redirect("/app/student");
  redirect(`/org/${workspace}/app`);
}
