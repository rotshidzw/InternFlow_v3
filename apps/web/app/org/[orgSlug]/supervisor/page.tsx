import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";

const SUPERVISOR_ALLOWED = new Set(["SUPERVISOR", "COORDINATOR", "PROVIDER_ADMIN"]);

export default async function SupervisorPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  if (!SUPERVISOR_ALLOWED.has(access.membership.role)) redirect(`/org/${params.orgSlug}/${access.membership.role.toLowerCase().replace("_", "-")}`);

  const logbooks = await prisma.logbookEntry.findMany({
    where: { user: { memberships: { some: { organizationId: access.membership.organizationId } } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true }
  });

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <h1 className="text-2xl font-semibold">Supervisor portal</h1>
      <p className="mt-2 text-sm text-slate-200">Review learner progress and weekly logbook entries.</p>
      <section className="mt-4 space-y-2 rounded-xl border border-white/15 bg-white/5 p-4">
        {logbooks.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-white/10 p-2 text-sm">
            <p>{entry.user.email} · {entry.summary}</p>
            <form action={`/api/org/${params.orgSlug}/logbooks/${entry.id}/approval`} method="post" className="mt-2 flex gap-2">
              <select name="status" className="rounded border border-white/20 bg-slate-950/40 px-2 py-1">
                <option value="APPROVED">Approve</option>
                <option value="REJECTED">Reject</option>
              </select>
              <input name="comment" placeholder="Comment" className="flex-1 rounded border border-white/20 bg-slate-950/40 px-2 py-1" />
              <button className="rounded border border-white/20 px-2 py-1">Submit</button>
            </form>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
