import { redirect } from "next/navigation";

export default async function TenantAppRoot({ params }: { params: { orgSlug: string } }) {
  redirect(`/org/${params.orgSlug}/app/dashboard`);
}
