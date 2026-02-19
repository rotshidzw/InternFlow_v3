import { redirect } from "next/navigation";
import { getCurrentUser, getSelectedWorkspaceSlug } from "@/lib/session";

export default async function AppEntry() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  if (user.role === "STUDENT") {
    redirect("/app/student");
  }

  const workspace = getSelectedWorkspaceSlug();
  if (!workspace) redirect("/workspaces");
  redirect(`/org/${workspace}/app`);
}
