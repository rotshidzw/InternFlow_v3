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
    <div className="if-auth-page gap-4">
      <section className="if-auth-hero">
        <p className="if-kicker">HQ administration</p>
        <h1 className="if-auth-title mt-2">HQ Users & RBAC</h1>
        <p className="if-auth-subtitle">Only InternFlow platform users are eligible for HQ access and role assignment.</p>
      </section>

      <div className="if-panel rounded-xl p-4">
        <h2 className="if-section-title">Create InternFlow platform user</h2>
        <form action="/api/hq/users" method="post" className="mt-3 grid gap-2 md:grid-cols-4">
          <input type="hidden" name="action" value="create" />
          <input required name="email" type="email" placeholder="name@internflow.com" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-brand-text" />
          <input name="name" placeholder="Full name" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-brand-text" />
          <select name="role" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-brand-text">
            <option>PLATFORM_ADMIN</option>
            <option>PLATFORM_SALES</option>
            <option>PLATFORM_SUPPORT</option>
            <option>PLATFORM_OPS</option>
            <option>PLATFORM_FINANCE</option>
          </select>
          <button className="if-btn if-btn-primary px-3 py-2 text-sm">Create user</button>
        </form>
      </div>

      <div className="if-panel rounded-xl p-4">
        <h2 className="if-section-title">Assign platform role</h2>
        <form action="/api/hq/users" method="post" className="mt-3 grid gap-2 md:grid-cols-3">
          <input type="hidden" name="action" value="assign" />
          <select name="userId" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-brand-text">
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
          <select name="role" className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-brand-text">
            <option>PLATFORM_ADMIN</option>
            <option>PLATFORM_SALES</option>
            <option>PLATFORM_SUPPORT</option>
            <option>PLATFORM_OPS</option>
            <option>PLATFORM_FINANCE</option>
          </select>
          <button className="if-btn if-btn-secondary px-3 py-2 text-sm">Assign role</button>
        </form>
      </div>

      <div className="if-panel rounded-xl p-4">
        <h2 className="if-section-title">Current platform users</h2>
        <div className="mt-3 space-y-2">
          {memberships.map((m) => (
            <div key={m.id} className="if-panel-muted flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm">
              <p className="text-brand-textSoft">{m.user.email} - <span className="font-medium text-brand-text">{m.role}</span></p>
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
