import { redirect } from "next/navigation";
import { getSelectedWorkspaceSlug } from "@/lib/session";

export default function LegacyStudentPage() {
  const slug = getSelectedWorkspaceSlug();
  redirect(slug ? `/org/${slug}/student` : "/workspaces");
}
