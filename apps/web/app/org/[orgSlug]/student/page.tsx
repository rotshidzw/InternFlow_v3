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
  return counts
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((x) => `${x.k}(${x.count})`)
    .join(", ");
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function StudentOrgPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  if (access.membership.role !== "STUDENT") redirect(`/org/${params.orgSlug}/app/dashboard`);
  const boundEntryIds = await listTenantBoundLogbookEntryIds(access.membership.organizationId);

  const applications = await prisma.application.findMany({
    where: {
      userId: access.user.id,
      opportunity: { organizationId: access.membership.organizationId },
    },
    include: { opportunity: true, checklist: { include: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  const logbooks = boundEntryIds.length
    ? await prisma.logbookEntry.findMany({
        where: { userId: access.user.id, id: { in: boundEntryIds } },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];
  const docs = await prisma.document.findMany({
    where: { userId: access.user.id },
    take: 8,
    orderBy: { createdAt: "desc" },
  });
  const notifications = await prisma.notification.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const checklist = applications[0]?.checklist;
  const checklistItems = checklist?.items ?? [];
  const nextTask = checklistItems.find((item) => item.status !== "DONE");
  const overdue = checklistItems.filter(
    (item) => item.status !== "DONE" && item.dueDate && item.dueDate < new Date(),
  ).length;

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

  const docsNeedingAction = docs.filter((doc) => ["REJECTED", "SCAN_FAILED"].includes(doc.status)).length;
  const docsProcessing = docs.filter((doc) => ["SUBMITTED", "SCAN_PENDING", "SCAN_OK"].includes(doc.status)).length;
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const checklistDoneCount = checklistItems.filter((item) => item.status === "DONE").length;
  const weeklyCompletionPct = weeklyGoals.length
    ? Math.round((weeklyCompleted / weeklyGoals.length) * 100)
    : 100;
  const logbooksThisMonth = logbooks.filter(
    (logbook) =>
      logbook.createdAt.getFullYear() === new Date().getFullYear() &&
      logbook.createdAt.getMonth() === new Date().getMonth(),
  ).length;
  const attentionCount = [overdue, docsNeedingAction, nextTask ? 1 : 0, unreadNotifications > 0 ? 1 : 0].reduce(
    (sum, value) => sum + (value > 0 ? 1 : 0),
    0,
  );

  return (
    <AppShell
      orgSlug={params.orgSlug}
      role={access.membership.role}
      orgName={access.membership.organization.name}
    >
      <div className="if-auth-page gap-4">
        <section className="if-auth-hero">
          <p className="if-marketing-eyebrow text-brand-accentStrong">Assigned Student Portal</p>
          <h1 className="if-auth-title mt-2">Student lifecycle dashboard</h1>
          <p className="if-auth-subtitle">
            Track checklist milestones, support updates, documents, and weekly goals with a clear
            action-first workspace.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <a href="#applications" className="if-action-chip">
              Applications
            </a>
            <a href="#checklist" className="if-action-chip">
              Checklist
            </a>
            <a href="#documents" className="if-action-chip">
              Documents
            </a>
            <a href="#weekly-goals" className="if-action-chip">
              Weekly goals
            </a>
          </div>
        </section>

        <section className="if-auth-metrics md:grid-cols-2 xl:grid-cols-4">
          <article className="if-auth-metric">
            <p className="if-auth-metric-label">Onboarding progress</p>
            <p className="if-auth-metric-value">{checklist?.progress ?? 0}%</p>
            <p className="if-caption-text">Next task: {nextTask?.label ?? "All done"}</p>
          </article>
          <article className="if-auth-metric">
            <p className="if-auth-metric-label">Weekly goals</p>
            <p className="if-auth-metric-value">{weeklyCompletionPct}%</p>
            <p className="if-caption-text">
              {weeklyCompleted}/{weeklyGoals.length} completed this week
            </p>
          </article>
          <article className="if-auth-metric">
            <p className="if-auth-metric-label">Document workflow</p>
            <p className="if-auth-metric-value">{docs.length}</p>
            <p className="if-caption-text">{docsNeedingAction} need action | {docsProcessing} processing</p>
          </article>
          <article className="if-auth-metric">
            <p className="if-auth-metric-label">Notifications</p>
            <p className="if-auth-metric-value">{unreadNotifications}</p>
            <p className="if-caption-text">Unread updates requiring review</p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <article className="if-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="if-panel-title">Attention now</h2>
              <span className="if-status if-status-warning">{attentionCount} signals</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <p className="if-panel-muted rounded-lg px-3 py-2 text-brand-textSoft">
                Overdue checklist items: {overdue}
              </p>
              <p className="if-panel-muted rounded-lg px-3 py-2 text-brand-textSoft">
                Documents needing action: {docsNeedingAction}
              </p>
              <p className="if-panel-muted rounded-lg px-3 py-2 text-brand-textSoft">
                Unread notifications: {unreadNotifications}
              </p>
            </div>
          </article>

          <article className="if-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="if-panel-title">Healthy progress</h2>
              <span className="if-status if-status-success">{checklistDoneCount} done</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <p className="if-panel-muted rounded-lg px-3 py-2 text-brand-textSoft">
                Checklist completion: {checklistDoneCount}/{checklistItems.length}
              </p>
              <p className="if-panel-muted rounded-lg px-3 py-2 text-brand-textSoft">
                Logs submitted this month: {logbooksThisMonth}
              </p>
              <p className="if-panel-muted rounded-lg px-3 py-2 text-brand-textSoft">
                Latest application status: {applications[0]?.status ?? "Not started"}
              </p>
            </div>
          </article>

          <article className="if-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="if-panel-title">Next actions</h2>
              <span className="if-status if-status-draft">Guided</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <a href="#checklist" className="if-panel-muted block rounded-lg px-3 py-2 text-brand-textSoft">
                Complete outstanding checklist tasks
              </a>
              <a href="#documents" className="if-panel-muted block rounded-lg px-3 py-2 text-brand-textSoft">
                Resolve document verification exceptions
              </a>
              <a href="/app/whatsapp-sim" className="if-panel-muted block rounded-lg px-3 py-2 text-brand-textSoft">
                Open support and ask for guidance
              </a>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <section id="applications" className="if-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="if-panel-title">Applications timeline</h2>
              <span className="if-status if-status-pending">{applications.length} records</span>
            </div>
            <div className="space-y-2 text-sm">
              {applications.length === 0 ? (
                <p className="if-empty-state text-sm">
                  No applications linked to this organisation yet.
                </p>
              ) : (
                applications.map((application) => (
                  <div key={application.id} className="if-panel-muted rounded-lg px-3 py-2">
                    <p className="if-card-title">{application.opportunity.title}</p>
                    <p className="if-caption-text mt-1">
                      Status: {application.status} | Submitted {isoDate(application.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="if-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="if-panel-title">Notifications</h2>
              <a href="/app/whatsapp-sim" className="text-sm text-brand-accentStrong">
                Open messages
              </a>
            </div>
            <div className="space-y-2 text-sm">
              {notifications.length === 0 ? (
                <p className="if-empty-state text-sm">
                  No alerts right now. Keep your checklist up to date.
                </p>
              ) : (
                notifications.map((item) => (
                  <div key={item.id} className="if-panel-muted rounded-lg border border-brand-border/60 p-3">
                    <p className="font-medium text-brand-text">{item.title}</p>
                    <p className="text-brand-textSoft">{item.body}</p>
                    <p className="text-xs text-brand-muted">
                      {item.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <section id="checklist" className="if-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="if-panel-title">Checklist actions</h2>
              <span className="if-status if-status-warning">Overdue: {overdue}</span>
            </div>
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <form
                  key={item.id}
                  action={`/api/checklist/items/${item.id}/complete`}
                  method="post"
                  className="if-panel-muted flex items-center justify-between rounded-lg border border-brand-border/60 p-2 text-sm"
                >
                  <span className="text-brand-textSoft">
                    {item.label} - {item.status}
                  </span>
                  <button
                    disabled={item.status === "DONE"}
                    className="if-btn if-btn-primary px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Complete
                  </button>
                </form>
              ))}
              {checklistItems.length === 0 && (
                <p className="if-empty-state text-sm">
                  No checklist items available yet for this programme.
                </p>
              )}
            </div>
          </section>

          <section id="weekly-goals" className="if-panel rounded-xl p-4">
            <h2 className="if-panel-title">Weekly goals tracker</h2>
            <p className="if-panel-copy mt-1">
              Week window: {isoDate(currentWeekStart)} to {isoDate(currentWeekEnd)} | Completed {weeklyCompleted}/
              {weeklyGoals.length}
            </p>
            <div className="mt-2 space-y-2 text-sm">
              {weeklyGoals.length === 0 ? (
                <p className="if-empty-state text-sm">No goals configured for this week yet.</p>
              ) : (
                weeklyGoals.map((item) => (
                  <div
                    key={item.id}
                    className="if-panel-muted flex items-center justify-between rounded-lg border border-brand-border/60 p-2"
                  >
                    <span className="text-brand-textSoft">{item.label}</span>
                    <span className={item.status === "DONE" ? "text-emerald-300" : "text-amber-300"}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div id="documents" className="if-panel rounded-xl p-4">
            <h2 className="if-panel-title">Document vault + payslips</h2>
            <div className="mt-2 space-y-1 text-sm">
              {docs.length === 0 ? (
                <p className="if-empty-state text-sm">No documents uploaded yet.</p>
              ) : (
                docs.map((doc) => (
                  <p key={doc.id} className="if-panel-muted rounded-lg px-3 py-2 text-brand-textSoft">
                    {doc.type} - {doc.status}{" "}
                    {doc.expirationDate ? `- expires ${doc.expirationDate.toISOString().slice(0, 10)}` : ""}
                  </p>
                ))
              )}
            </div>
          </div>

          <div id="growth" className="if-panel rounded-xl p-4">
            <h2 className="if-panel-title">Learning growth summary</h2>
            <p className="if-body-text mt-2">
              Progress score: {Math.min(100, (checklist?.progress ?? 0) + logbooks.length * 3)} / 100
            </p>
            <p className="if-body-text mt-2">
              Trend keywords: {growthSummary(logbooks.map((logbook) => logbook.summary)) || "insufficient data"}
            </p>
            <p className="if-caption-text mt-1">Weekly logs submitted: {logbooks.length}</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
