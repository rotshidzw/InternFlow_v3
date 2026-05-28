import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";
import { listTenantBoundLogbookEntryIds } from "@/lib/logbook-tenant-binding";

function growthSummary(summaries: string[]) {
  const keywords = ["team", "debug", "api", "client", "compliance", "support"];
  const counts = keywords.map((k) => ({
    k,
    count: summaries.filter((s) => String(s ?? "").toLowerCase().includes(k)).length,
  }));
  return counts.sort((a, b) => b.count - a.count).slice(0, 3).map((x) => `${x.k}(${x.count})`).join(", ");
}

export default async function StudentOrgPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  if (access.membership.role !== "STUDENT") redirect(`/org/${params.orgSlug}/app/dashboard`);
  const boundEntryIds = await listTenantBoundLogbookEntryIds(access.membership.organizationId);

  const applications = await prisma.application.findMany({ where: { userId: access.user.id, opportunity: { organizationId: access.membership.organizationId } }, include: { opportunity: true, checklist: { include: { items: true } } }, orderBy: { createdAt: "desc" } });
  const logbooks = boundEntryIds.length
    ? await prisma.logbookEntry.findMany({
        where: { userId: access.user.id, id: { in: boundEntryIds } },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];
  const docs = await prisma.document.findMany({ where: { userId: access.user.id }, take: 8, orderBy: { createdAt: "desc" } });
  const notifications = await prisma.notification.findMany({ where: { userId: access.user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  const checklist = applications[0]?.checklist;
  const checklistItems = checklist?.items ?? [];
  const nextTask = checklistItems.find((item) => item.status !== "DONE");
  const overdue = checklistItems.filter((item) => item.status !== "DONE" && item.dueDate && item.dueDate < new Date()).length;

  const currentWeekStart = new Date();
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

  const weeklyGoals = checklistItems.filter((item) => {
    if (!item.dueDate) return true;
    return item.dueDate >= currentWeekStart && item.dueDate <= currentWeekEnd;
  });
  const weeklyCompleted = weeklyGoals.filter((item) => item.status === "DONE").length;

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <div className="if-auth-page">
        <section className="if-auth-hero">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Assigned Student Portal</p>
          <h1 className="if-auth-title mt-2">Student lifecycle dashboard</h1>
          <p className="if-auth-subtitle">Track programme progress, checklist actions, and weekly learning growth in one workspace.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <a href="#applications" className="if-action-chip">Applications</a>
            <a href="#checklist" className="if-action-chip">Checklist</a>
            <a href="#documents" className="if-action-chip">Documents</a>
            <a href="#weekly-goals" className="if-action-chip">Weekly goals</a>
          </div>
        </section>

        <div id="overview" className="if-auth-metrics md:grid-cols-3">
          <section className="if-auth-metric">
            <p className="if-auth-metric-label">Onboarding progress</p>
            <p className="mt-2 text-4xl font-bold text-brand-accentStrong">{checklist?.progress ?? 0}%</p>
            <p className="mt-2 text-sm text-brand-textSoft">Next task: {nextTask?.label ?? "All done"}</p>
            <p className="text-sm text-amber-300">Overdue items: {overdue}</p>
          </section>
          <section className="if-auth-metric">
            <p className="if-auth-metric-label">Phase status</p>
            <p className="mt-2 text-sm text-brand-textSoft">Phase 1 (intake): completed through invite and profile capture.</p>
            <p className="mt-1 text-sm text-brand-textSoft">Phase 2 (assigned): active under this organisation workspace.</p>
          </section>
          <section className="if-auth-metric">
            <p className="if-auth-metric-label">Compliance focus</p>
            <p className="mt-2 text-sm text-brand-textSoft">Keep documents current and complete checklist actions before due dates.</p>
          </section>
        </div>

        <section id="applications" className="if-panel rounded-xl p-4">
          <p className="if-auth-metric-label">Applications timeline</p>
          {applications.length === 0 ? (
            <p className="mt-2 text-sm text-brand-muted">No applications linked to this organisation yet.</p>
          ) : (
            applications.map((application) => (
              <p key={application.id} className="mt-2 text-sm text-brand-textSoft">
                {application.opportunity.title} - <span className="font-medium text-brand-text">{application.status}</span>
              </p>
            ))
          )}
        </section>

        <section id="checklist" className="if-panel rounded-xl p-4">
          <h2 className="font-semibold text-brand-text">Checklist actions</h2>
          <div className="mt-2 space-y-2">
            {checklistItems.map((item) => (
              <form key={item.id} action={`/api/checklist/items/${item.id}/complete`} method="post" className="if-panel-muted flex items-center justify-between rounded-lg border border-brand-border/60 p-2 text-sm">
                <span className="text-brand-textSoft">{item.label} - {item.status}</span>
                <button disabled={item.status === "DONE"} className="if-btn if-btn-primary px-3 py-1 text-xs disabled:opacity-50">Complete</button>
              </form>
            ))}
            {checklistItems.length === 0 && (
              <p className="if-empty-state text-sm">No checklist items available yet for this programme.</p>
            )}
          </div>
        </section>

        <section id="weekly-goals" className="if-panel rounded-xl p-4">
          <h2 className="font-semibold text-brand-text">Weekly goals tracker</h2>
          <p className="mt-1 text-sm text-brand-textSoft">Week window: {currentWeekStart.toISOString().slice(0, 10)} to {currentWeekEnd.toISOString().slice(0, 10)} - completed {weeklyCompleted}/{weeklyGoals.length}</p>
          <div className="mt-2 space-y-2 text-sm">
            {weeklyGoals.length === 0 ? <p className="text-brand-muted">No goals configured for this week yet.</p> : weeklyGoals.map((item) => (
              <div key={item.id} className="if-panel-muted flex items-center justify-between rounded-lg border border-brand-border/60 p-2">
                <span className="text-brand-textSoft">{item.label}</span>
                <span className={item.status === "DONE" ? "text-emerald-300" : "text-amber-300"}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="if-panel rounded-xl p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-brand-text">Notifications</h2>
            <a href="/app/whatsapp-sim" className="text-sm text-brand-accentStrong">Open messages</a>
          </div>
          <div className="mt-2 space-y-2 text-sm">
            {notifications.length === 0 ? (
              <p className="text-brand-muted">No alerts right now. Keep your checklist up to date.</p>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="if-panel-muted rounded-lg border border-brand-border/60 p-3">
                  <p className="font-medium text-brand-text">{item.title}</p>
                  <p className="text-brand-textSoft">{item.body}</p>
                  <p className="text-xs text-brand-muted">{item.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div id="documents" className="if-panel rounded-xl p-4">
            <h2 className="font-semibold text-brand-text">Document vault + payslips</h2>
            {docs.length === 0 ? <p className="mt-2 text-sm text-brand-muted">No documents uploaded yet.</p> : docs.map((doc) => <p key={doc.id} className="mt-1 text-sm text-brand-textSoft">{doc.type} - {doc.status} {doc.expirationDate ? `- expires ${doc.expirationDate.toISOString().slice(0, 10)}` : ""}</p>)}
          </div>
          <div id="growth" className="if-panel rounded-xl p-4">
            <h2 className="font-semibold text-brand-text">Learning growth summary</h2>
            <p className="mt-2 text-sm text-brand-textSoft">Progress score: {Math.min(100, (checklist?.progress ?? 0) + logbooks.length * 3)} / 100</p>
            <p className="mt-2 text-sm text-brand-textSoft">Trend keywords: {growthSummary(logbooks.map((logbook) => logbook.summary)) || "insufficient data"}</p>
            <p className="mt-1 text-sm text-brand-textSoft">Weekly logs submitted: {logbooks.length}</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
