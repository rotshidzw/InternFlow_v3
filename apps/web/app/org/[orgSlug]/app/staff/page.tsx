import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function StaffPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string };
  searchParams?: { inviteLink?: string };
}) {
  const access = await requireTenantAccess(params.orgSlug);
  const staff = await prisma.membership.findMany({
    where: {
      organizationId: access.membership.organizationId,
      role: { in: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] },
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  const programs = await prisma.program.findMany({
    where: { organizationId: access.membership.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Staff & Roles</h1>

      <form
        action={`/api/org/${params.orgSlug}/staff/invite`}
        method="post"
        className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-4"
      >
        <input
          required
          type="email"
          name="email"
          placeholder="staff@org.co.za"
          className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2"
        />
        <input
          name="name"
          placeholder="Full name"
          className="rounded border border-slate-300 px-2 py-2 text-sm"
        />
        <select
          name="role"
          className="rounded border border-slate-300 px-2 py-2 text-sm"
        >
          <option>PROVIDER_ADMIN</option>
          <option>COORDINATOR</option>
          <option>SUPERVISOR</option>
        </select>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Invite/Add staff
        </button>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Generate student invite link
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Share this link with students. Default expiry is 14 days and max uses
          is 1.
        </p>
        <form
          action={`/api/org/${params.orgSlug}/student-invites`}
          method="post"
          className="mt-3 grid gap-2 md:grid-cols-4"
        >
          <input
            name="expiresInDays"
            defaultValue="14"
            type="number"
            min="1"
            max="90"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          />
          <input
            name="maxUses"
            defaultValue="1"
            type="number"
            min="1"
            max="500"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          />
          <select
            name="programmeId"
            className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2"
          >
            <option value="">Any programme</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          <button className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white md:col-span-4">
            Generate student invite link
          </button>
        </form>
        {searchParams?.inviteLink && (
          <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-medium">Invite link generated:</p>
            <p className="mt-1 break-all">{searchParams.inviteLink}</p>
          </div>
        )}
      </section>

      {staff.map((s) => (
        <div
          key={s.id}
          className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
        >
          {s.user.email} · {s.role}
        </div>
      ))}
    </div>
  );
}
