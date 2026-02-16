import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function StaffPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const staff = await prisma.membership.findMany({ where: { organizationId: access.membership.organizationId, role: { in: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] } }, include: { user: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Staff & Roles</h1>
      <form action={`/api/org/${params.orgSlug}/staff/invite`} method="post" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-4">
        <input required type="email" name="email" placeholder="staff@org.co.za" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2" />
        <input name="name" placeholder="Full name" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        <select name="role" className="rounded border border-slate-300 px-2 py-2 text-sm"><option>PROVIDER_ADMIN</option><option>COORDINATOR</option><option>SUPERVISOR</option></select>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Invite/Add staff</button>
      </form>
      {staff.map((s) => <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">{s.user.email} · {s.role}</div>)}
    </div>
  );
}
