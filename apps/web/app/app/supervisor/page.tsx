import { redirect } from "next/navigation";
import { getSelectedWorkspaceSlug } from "@/lib/session";

export default function LegacySupervisorPage() {
  const slug = getSelectedWorkspaceSlug();
  redirect(slug ? `/org/${slug}/supervisor` : "/workspaces");
}
