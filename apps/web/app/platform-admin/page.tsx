import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";

export default async function PlatformAdminPage() {
  const email = cookies().get("if_user")?.value;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (!user || user.role !== "SYSTEM_ADMIN") {
    return <div className="p-8 text-white">Access denied. SYSTEM_ADMIN only.</div>;
  }

  const orgs = await prisma.organization.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto mt-10 max-w-6xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">InternFlow Platform Admin</h1>
      <p className="mt-2 text-slate-200">Approve or reject tenant organisations after compliance review.</p>
      <div className="mt-6 space-y-3">
        {orgs.map((org) => (
          <div key={org.id} className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="font-semibold">{org.name}</p>
            <p className="text-sm text-slate-300">{org.slug} · {org.type} · {org.status}</p>
            <div className="mt-3 flex gap-2">
              <form action={`/api/platform/orgs/${org.id}/decision`} method="post">
                <input type="hidden" name="action" value="APPROVED" />
                <button className="rounded-lg bg-emerald-500 px-3 py-2 text-sm text-slate-950">Approve</button>
              </form>
              <form action={`/api/platform/orgs/${org.id}/decision`} method="post">
                <input type="hidden" name="action" value="REJECTED" />
                <input name="notes" placeholder="Rejection notes" className="rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm" />
                <button className="ml-2 rounded-lg border border-red-400/50 px-3 py-2 text-sm text-red-200">Reject</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
