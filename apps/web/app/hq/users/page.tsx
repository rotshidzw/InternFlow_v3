import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";

export default async function HQUsersPage() {
  await requirePlatformAccess(["PLATFORM_ADMIN"]);

  const [users, memberships] = await Promise.all([
    prisma.user.findMany({
      where: {
        email: {
          endsWith: "@internflow.com"
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.platformMembership.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">HQ Users & RBAC</h1>
      <p className="text-sm text-slate-600">Only InternFlow platform users are eligible for HQ access and role assignment.</p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Create InternFlow platform user</h2>
        <form action="/api/hq/users" method="post" className="mt-3 grid gap-2 md:grid-cols-4">
          <input type="hidden" name="action" value="create" />
          <input required name="email" type="email" placeholder="name@internflow.com" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900" />
          <input name="name" placeholder="Full name" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900" />
          <select name="role" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900">
            <option>PLATFORM_ADMIN</option>
            <option>PLATFORM_SALES</option>
            <option>PLATFORM_SUPPORT</option>
            <option>PLATFORM_OPS</option>
            <option>PLATFORM_FINANCE</option>
          </select>
          <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Create user</button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Assign platform role</h2>
        <form action="/api/hq/users" method="post" className="mt-3 grid gap-2 md:grid-cols-3">
          <input type="hidden" name="action" value="assign" />
          <select name="userId" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900">
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
          <select name="role" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900">
            <option>PLATFORM_ADMIN</option>
            <option>PLATFORM_SALES</option>
            <option>PLATFORM_SUPPORT</option>
            <option>PLATFORM_OPS</option>
            <option>PLATFORM_FINANCE</option>
          </select>
          <button className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Assign role</button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Current platform users</h2>
        <div className="mt-3 space-y-2">
          {memberships.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <p>{m.user.email} · <span className="font-medium">{m.role}</span></p>
              <form action="/api/hq/users" method="post">
                <input type="hidden" name="action" value="deleteMembership" />
                <input type="hidden" name="membershipId" value={m.id} />
                <button className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700">Remove role</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
