import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";

export default async function SupervisorPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");

  const logbooks = await prisma.logbookEntry.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { user: true } });

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <h1 className="text-2xl font-semibold">Supervisor portal</h1>
      <p className="mt-2 text-sm text-slate-200">Review learner progress and weekly logbook entries.</p>
      <section className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4">
        {logbooks.map((entry) => <p key={entry.id} className="mt-1 text-sm">{entry.user.email} · {entry.summary}</p>)}
      </section>
    </AppShell>
  );
}
