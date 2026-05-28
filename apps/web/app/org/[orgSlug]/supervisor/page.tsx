import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";

export default async function SupervisorPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  if (
    !["SUPERVISOR", "COORDINATOR", "PROVIDER_ADMIN", "TRAINER", "FACILITATOR", "SYSTEM_ADMIN"].includes(
      access.membership.role,
    )
  ) {
    redirect(`/org/${params.orgSlug}/app`);
  }

  const logbooks = await prisma.logbookEntry.findMany({
    where: {
      user: {
        memberships: {
          some: { organizationId: access.membership.organizationId },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true },
  });

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <div className="if-auth-page">
        <section className="if-auth-hero">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Supervisor</p>
          <h1 className="if-auth-title mt-2">Logbook approvals</h1>
          <p className="if-auth-subtitle">Review learner progress and complete weekly logbook approvals from one queue.</p>
        </section>

        <section className="if-panel rounded-xl p-4 space-y-2">
          {logbooks.map((entry) => (
            <div key={entry.id} className="if-panel-muted rounded-lg border border-brand-border/60 p-3 text-sm">
              <p className="text-brand-textSoft">{entry.user.email} - {entry.summary}</p>
              <form action={`/api/org/${params.orgSlug}/logbooks/${entry.id}/approval`} method="post" className="if-filter-grid mt-2 md:grid-cols-[180px_1fr_auto]">
                <select name="status" className="rounded px-2 py-1 text-sm">
                  <option value="APPROVED">Approve</option>
                  <option value="REJECTED">Reject</option>
                </select>
                <input name="comment" placeholder="Comment" className="rounded px-2 py-1 text-sm" />
                <button className="if-btn if-btn-secondary px-2 py-1 text-xs">Submit</button>
              </form>
            </div>
          ))}
          {logbooks.length === 0 ? <p className="if-empty-state text-sm">No logbook entries queued.</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
