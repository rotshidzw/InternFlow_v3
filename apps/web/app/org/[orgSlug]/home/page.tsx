import { redirect } from "next/navigation";
import { getOrgAccess } from "@/lib/org-access";

export default async function OrgHome({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  redirect(`/org/${params.orgSlug}/app`);
}
