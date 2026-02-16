import { redirect } from "next/navigation";
import { getSelectedWorkspaceSlug } from "@/lib/session";

export default function LegacyCoordinatorPage() {
  const slug = getSelectedWorkspaceSlug();
  redirect(slug ? `/org/${slug}/coordinator` : "/workspaces");
}
