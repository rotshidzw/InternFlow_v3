import { redirect } from "next/navigation";
import { getSelectedWorkspaceSlug } from "@/lib/session";

export default function LegacyProviderPage() {
  const slug = getSelectedWorkspaceSlug();
  redirect(slug ? `/org/${slug}/provider-admin` : "/workspaces");
}
