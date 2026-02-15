import { prisma } from "@internflow/db/src";

export default async function HQUsersPage() {
  const [users, memberships] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.platformMembership.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">HQ Users & RBAC</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Assign platform role</h2>
        <form action="/api/hq/users" method="post" className="mt-3 grid gap-2 md:grid-cols-3">
          <select name="userId" className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm">{users.map((u)=><option key={u.id} value={u.id}>{u.email}</option>)}</select>
          <select name="role" className="rounded border border-slate-300 bg-white text-slate-900 px-2 py-2 text-sm">
            <option>PLATFORM_ADMIN</option><option>PLATFORM_SALES</option><option>PLATFORM_SUPPORT</option><option>PLATFORM_OPS</option><option>PLATFORM_FINANCE</option>
          </select>
          <button className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Assign</button>
        </form>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Current platform users</h2>
        {memberships.map((m)=><p key={m.id} className="mt-1 text-sm">{m.user.email} · {m.role}</p>)}
      </div>
    </div>
  );
}
