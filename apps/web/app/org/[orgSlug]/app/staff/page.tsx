import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

type StaffSearchParams = {
  q?: string;
  role?: string;
  saved?: string;
  error?: string;
};

const STAFF_ROLES = ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] as const;

export default async function StaffPage({
  params,
  searchParams
}: {
  params: { orgSlug: string };
  searchParams?: StaffSearchParams;
}) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const rawRoleFilter = String(searchParams?.role ?? "ALL").toUpperCase();
  const roleFilter = rawRoleFilter === "ALL" || STAFF_ROLES.includes(rawRoleFilter as (typeof STAFF_ROLES)[number]) ? rawRoleFilter : "ALL";
  const query = String(searchParams?.q ?? "").trim().toLowerCase();

  const staff = await prisma.membership.findMany({
    where: {
      organizationId: orgId,
      role: { in: [...STAFF_ROLES] },
      ...(roleFilter !== "ALL" ? { role: roleFilter as any } : {})
    },
    include: { user: true },
    orderBy: { createdAt: "desc" }
  });

  const filteredStaff = staff.filter((member) => {
    if (!query) return true;
    const text = `${member.user.email} ${member.user.name ?? ""} ${member.role}`.toLowerCase();
    return text.includes(query);
  });

  const counts = {
    total: staff.length,
    providerAdmins: staff.filter((member) => member.role === "PROVIDER_ADMIN").length,
    coordinators: staff.filter((member) => member.role === "COORDINATOR").length,
    supervisors: staff.filter((member) => member.role === "SUPERVISOR").length
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Staff &amp; Roles</h1>
        <p className="text-sm text-slate-600">Manage organization staff access and responsibilities for provider admins, coordinators, and supervisors.</p>
      </div>

      {searchParams?.saved === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Staff member saved successfully.</div>
      )}

      {(searchParams?.error === "invalid" || searchParams?.error === "forbidden") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {searchParams?.error === "forbidden"
            ? "You do not have permission to manage staff in this organization."
            : "Please provide a valid staff email and role."}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total staff</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Provider admins</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{counts.providerAdmins}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Coordinators</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{counts.coordinators}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Supervisors</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{counts.supervisors}</p>
        </div>
      </div>

      <form action={`/api/org/${params.orgSlug}/staff/invite`} method="post" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-4">
        <input required type="email" name="email" placeholder="staff@org.co.za" className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2" />
        <input name="name" placeholder="Full name" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        <select name="role" defaultValue="COORDINATOR" className="rounded border border-slate-300 px-2 py-2 text-sm">
          <option value="PROVIDER_ADMIN">PROVIDER_ADMIN</option>
          <option value="COORDINATOR">COORDINATOR</option>
          <option value="SUPERVISOR">SUPERVISOR</option>
        </select>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white md:col-span-4">Invite/Add staff</button>
      </form>

      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3" method="get">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Search staff
          <input
            name="q"
            defaultValue={searchParams?.q ?? ""}
            placeholder="email, name, or role"
            className="h-9 min-w-[220px] rounded-md border border-slate-300 px-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Role
          <select name="role" defaultValue={roleFilter} className="h-9 min-w-[170px] rounded-md border border-slate-300 px-2 text-sm">
            <option value="ALL">All roles</option>
            <option value="PROVIDER_ADMIN">Provider admin</option>
            <option value="COORDINATOR">Coordinator</option>
            <option value="SUPERVISOR">Supervisor</option>
          </select>
        </label>

        <button className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700">Apply filters</button>
      </form>

      <div className="space-y-2">
        {filteredStaff.map((member) => (
          <div key={member.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium text-slate-900">{member.user.email}</p>
            <p className="text-xs text-slate-600">
              {member.user.name ? `${member.user.name} · ` : ""}
              {member.role}
            </p>
          </div>
        ))}

        {filteredStaff.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">No staff matched your filters.</div>
        )}
      </div>
    </div>
  );
}
