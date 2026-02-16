import { redirect } from "next/navigation";
import { getOrgAccess } from "@/lib/org-access";

export default async function OrgDashboardRouter({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) {
    if (access.error === "unauthenticated") redirect("/auth");
    if (access.error === "pending") redirect("/workspaces");
    redirect("/workspaces");
  }

  const rolePath = access.membership.role.toLowerCase().replace("_", "-");
  redirect(`/org/${params.orgSlug}/${rolePath}`);
}
