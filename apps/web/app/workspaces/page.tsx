import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WorkspacesPage() {
  const email = cookies().get("if_user")?.value;
  if (!email) {
    return <div className="p-8 text-brand-text">Please login at <Link href="/auth" className="underline">/auth</Link>.</div>;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: true } } }
  });

  if (!user) return <div className="p-8 text-brand-text">Account not found.</div>;

  const remembered = cookies().get("if_workspace")?.value;
  const rememberedMembership = remembered ? user.memberships.find((m) => m.organization.slug === remembered) : null;

  if (rememberedMembership) {
    if (rememberedMembership.role === "STUDENT") redirect("/app/student");
    redirect(`/org/${rememberedMembership.organization.slug}/app`);
  }

  if (user.memberships.length === 1) {
    const single = user.memberships[0];
    cookies().set("if_workspace", single.organization.slug, { path: "/", sameSite: "lax" });
    if (single.role === "STUDENT") redirect("/app/student");
    redirect(`/org/${single.organization.slug}/app`);
  }

  return (
    <div className="if-panel mx-auto mt-10 max-w-5xl rounded-3xl p-8">
      <h1 className="text-3xl font-semibold">Select a workspace</h1>
      <p className="mt-2 text-brand-textSoft">Choose the organisation workspace you want to enter.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {user.memberships.map((membership) => (
          <div key={membership.id} className="if-panel-muted rounded-2xl p-4">
            <h2 className="text-lg font-semibold">{membership.organization.name}</h2>
            <p className="text-sm text-brand-muted">Role: {membership.role.replace("_", " ")}</p>
            <p className="text-sm text-brand-muted">Status: {membership.organization.status}</p>
            {membership.organization.status === "REJECTED" && (
              <p className="if-status-error mt-2 rounded-md border px-2 py-1 text-xs">Reason: {membership.organization.rejectionReason ?? "Needs re-submission"}</p>
            )}
            <Link href={`/workspaces/open/${membership.organization.slug}`} className="if-btn if-btn-primary mt-3 inline-flex text-sm">Open workspace</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
