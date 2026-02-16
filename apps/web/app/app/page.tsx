import { redirect } from "next/navigation";
import { getSelectedWorkspaceSlug } from "@/lib/session";

export default function AppEntry() {
  const workspace = getSelectedWorkspaceSlug();
  if (!workspace) redirect("/workspaces");
  redirect(`/org/${workspace}/app`);
}
