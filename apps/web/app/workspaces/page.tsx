import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WorkspacesPage() {
  const email = cookies().get("if_user")?.value;
  if (!email) {
    return <div className="p-8 text-white">Please login at <Link href="/auth" className="underline">/auth</Link>.</div>;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: true } } }
  });

  if (!user) return <div className="p-8 text-white">Account not found.</div>;

  const remembered = cookies().get("if_workspace")?.value;
  const rememberedMembership = remembered ? user.memberships.find((m) => m.organization.slug === remembered) : null;

  if (rememberedMembership) {
    redirect(`/org/${rememberedMembership.organization.slug}/app`);
  }

  if (user.memberships.length === 1) {
    const single = user.memberships[0];
    cookies().set("if_workspace", single.organization.slug, { path: "/", sameSite: "lax" });
    const rolePath = single.role.toLowerCase().replace("_", "-");
    redirect(`/org/${single.organization.slug}/app`);
  }

  return (
    <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">Select a workspace</h1>
      <p className="mt-2 text-slate-200">Choose the organisation workspace you want to enter.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {user.memberships.map((membership) => (
          <div key={membership.id} className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">{membership.organization.name}</h2>
            <p className="text-sm text-slate-300">Role: {membership.role.replace("_", " ")}</p>
            <p className="text-sm text-slate-300">Status: {membership.organization.status}</p>
            {membership.organization.status === "REJECTED" && (
              <p className="mt-2 text-xs text-red-300">Reason: {membership.organization.rejectionReason ?? "Needs re-submission"}</p>
            )}
            <Link href={`/workspaces/open/${membership.organization.slug}`} className="mt-3 inline-block rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950">Open workspace</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
