import { redirect } from "next/navigation";
import { getOrgAccess } from "@/lib/org-access";

export async function requireTenantAccess(orgSlug: string) {
  const access = await getOrgAccess(orgSlug);
  if ("error" in access) {
    if (access.error === "unauthenticated") redirect("/auth");
    redirect("/workspaces");
  }
  if (access.membership.role === "STUDENT") redirect(`/org/${orgSlug}/student`);
  return access;
}
