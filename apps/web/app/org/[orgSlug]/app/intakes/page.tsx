import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

function statusForToken(invite: { expiresAt: Date; usedCount: number; maxUses: number }) {
  if (invite.expiresAt < new Date()) return "Expired";
  if (invite.usedCount >= invite.maxUses) return "Consumed";
  return "Active";
}

export default async function IntakesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const [programs, invites, pendingEnrollments] = await Promise.all([
    prisma.program.findMany({ where: { organizationId: orgId }, orderBy: { startDate: "desc" } }),
    prisma.inviteToken.findMany({
      where: { tenantId: orgId },
      include: { creator: true, programme: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.enrollment.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      include: { user: true, program: true },
      orderBy: { id: "desc" },
      take: 25,
    }),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Intake and onboarding</p>
        <h1 className="text-2xl font-semibold text-slate-900">Learner Intake Control Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create invite tokens, track pending learners, and keep onboarding flow clear.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Pending learners</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingEnrollments.length}</p>
          <p className="mt-1 text-xs text-slate-500">Need profile/doc completion follow-up.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Active invite tokens</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{invites.filter((i) => statusForToken(i) === "Active").length}</p>
          <p className="mt-1 text-xs text-slate-500">Share only with intended intake group.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Programme count</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{programs.length}</p>
          <p className="mt-1 text-xs text-slate-500">Bind invites directly to programme where possible.</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Create invite token</h2>
        <p className="mt-1 text-sm text-slate-600">Tokens support expiry + max uses and can bind to a programme.</p>
        <form action={`/api/org/${params.orgSlug}/student-invites`} method="post" className="mt-3 grid gap-2 md:grid-cols-4">
          <select name="programmeId" className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="">General intake token</option>
            {programs.map((programme) => (
              <option key={programme.id} value={programme.id}>{programme.name}</option>
            ))}
          </select>
          <input name="expiresInDays" defaultValue="14" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" placeholder="Expires in days" />
          <input name="maxUses" defaultValue="20" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" placeholder="Max uses" />
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">Generate invite link</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Recent tokens</h2>
        <div className="mt-3 space-y-2 text-sm">
          {invites.length === 0 ? (
            <p className="text-slate-500">No tokens generated yet.</p>
          ) : (
            invites.map((invite) => {
              const status = statusForToken(invite);
              return (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-900">{invite.token}</p>
                    <p className="text-xs text-slate-500">
                      Programme: {invite.programme?.name ?? "General"} · Uses {invite.usedCount}/{invite.maxUses} · Expires {invite.expiresAt.toISOString().slice(0, 10)} · by {invite.creator.email}
                    </p>
                    <p className="text-xs text-slate-600">Status: {status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      href={`${process.env.APP_URL ?? "http://localhost:3000"}/auth/setup?mode=join&token=${invite.token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open link
                    </a>
                    {status === "Active" ? (
                      <form action={`/api/org/${params.orgSlug}/student-invites/${invite.id}/revoke`} method="post">
                        <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700">Revoke</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Pending learner records</h2>
          <Link href={`/org/${params.orgSlug}/app/enrollments`} className="text-sm text-blue-600">Open enrollments</Link>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {pendingEnrollments.length === 0 ? (
            <p className="text-slate-500">No pending enrollments.</p>
          ) : (
            pendingEnrollments.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{item.user.name ?? item.user.email}</p>
                <p className="text-xs text-slate-600">Programme: {item.program.name} · Status: {item.status}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
