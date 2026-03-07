import { prisma } from "@internflow/db/src";
import { AppShell } from "@/components/app-shell";
import { getOrgAccess } from "@/lib/org-access";
import { redirect } from "next/navigation";

function growthSummary(summaries: string[]) {
  const keywords = ["team", "debug", "api", "client", "compliance", "support"];
  const counts = keywords.map((k) => ({ k, count: summaries.filter((s) => s.toLowerCase().includes(k)).length }));
  return counts.sort((a, b) => b.count - a.count).slice(0, 3).map((x) => `${x.k}(${x.count})`).join(", ");
}

export default async function StudentOrgPage({ params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) redirect(access.error === "unauthenticated" ? "/auth" : "/workspaces");
  if (access.membership.role !== "STUDENT") redirect(`/org/${params.orgSlug}/app/dashboard`);

  const applications = await prisma.application.findMany({ where: { userId: access.user.id, opportunity: { organizationId: access.membership.organizationId } }, include: { opportunity: true, checklist: { include: { items: true } } }, orderBy: { createdAt: "desc" } });
  const logbooks = await prisma.logbookEntry.findMany({ where: { userId: access.user.id }, orderBy: { createdAt: "desc" }, take: 8 });
  const docs = await prisma.document.findMany({ where: { userId: access.user.id }, take: 8, orderBy: { createdAt: "desc" } });
  const notifications = await prisma.notification.findMany({ where: { userId: access.user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  const checklist = applications[0]?.checklist;
  const nextTask = checklist?.items.find((i) => i.status !== "DONE");
  const overdue = checklist?.items.filter((i) => i.status !== "DONE" && i.dueDate && i.dueDate < new Date()).length ?? 0;

  const currentWeekStart = new Date();
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

  const weeklyGoals = checklist?.items.filter((item) => {
    if (!item.dueDate) return true;
    return item.dueDate >= currentWeekStart && item.dueDate <= currentWeekEnd;
  }) ?? [];
  const weeklyCompleted = weeklyGoals.filter((item) => item.status === "DONE").length;

  return (
    <AppShell orgSlug={params.orgSlug} role={access.membership.role} orgName={access.membership.organization.name}>
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned student portal</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Student lifecycle dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Track your assigned programme, documents, checklist actions, and weekly growth in one place.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a href="#applications" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Applications</a>
          <a href="#checklist" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Checklist</a>
          <a href="#documents" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Documents</a>
          <a href="#weekly-goals" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Weekly goals</a>
        </div>
      </section>

      <div id="overview" className="mt-4 grid gap-3 md:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Onboarding progress</p>
          <p className="mt-2 text-4xl font-bold text-emerald-600">{checklist?.progress ?? 0}%</p>
          <p className="mt-2 text-sm text-slate-700">Next task: {nextTask?.label ?? "All done"}</p>
          <p className="text-sm text-amber-700">Overdue items: {overdue}</p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Phase status</p>
          <p className="mt-2 text-sm text-slate-700">Phase 1 (intake): completed through invite and profile capture.</p>
          <p className="mt-1 text-sm text-slate-700">Phase 2 (assigned): active under this organisation workspace.</p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Compliance focus</p>
          <p className="mt-2 text-sm text-slate-700">Keep documents current and complete all checklist actions before due dates.</p>
        </section>
      </div>

      <section id="applications" className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Applications timeline</p>
        {applications.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No applications linked to this organisation yet.</p>
        ) : (
          applications.map((a) => (
            <p key={a.id} className="mt-2 text-sm text-slate-700">
              {a.opportunity.title} · <span className="font-medium">{a.status}</span>
            </p>
          ))
        )}
      </section>

      <section id="checklist" className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Checklist actions</h2>
        <div className="mt-2 space-y-2">
          {checklist?.items.map((item) => (
            <form key={item.id} action={`/api/checklist/items/${item.id}/complete`} method="post" className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm">
              <span className="text-slate-700">{item.label} · {item.status}</span>
              <button disabled={item.status === "DONE"} className="rounded bg-emerald-500 px-3 py-1 text-slate-950 disabled:opacity-50">Complete</button>
            </form>
          ))}
        </div>
      </section>

      <section id="weekly-goals" className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Weekly goals tracker</h2>
        <p className="mt-1 text-sm text-slate-600">Week window: {currentWeekStart.toISOString().slice(0, 10)} to {currentWeekEnd.toISOString().slice(0, 10)} · completed {weeklyCompleted}/{weeklyGoals.length}</p>
        <div className="mt-2 space-y-2 text-sm">
          {weeklyGoals.length === 0 ? <p className="text-slate-500">No goals configured for this week yet.</p> : weeklyGoals.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
              <span className="text-slate-700">{item.label}</span>
              <span className={item.status === "DONE" ? "text-emerald-700" : "text-amber-700"}>{item.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Notifications</h2>
          <a href="/app/whatsapp-sim" className="text-sm text-blue-600">Open messages</a>
        </div>
        <div className="mt-2 space-y-2 text-sm">
          {notifications.length === 0 ? (
            <p className="text-slate-600">No alerts right now. Keep your checklist up to date.</p>
          ) : (
            notifications.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-slate-700">{item.body}</p>
                <p className="text-xs text-slate-500">{item.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2">
        <div id="documents" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Document vault + payslips</h2>
          {docs.length === 0 ? <p className="mt-2 text-sm text-slate-600">No documents uploaded yet.</p> : docs.map((d) => <p key={d.id} className="mt-1 text-sm text-slate-700">{d.type} · {d.status} {d.expirationDate ? `· expires ${d.expirationDate.toISOString().slice(0, 10)}` : ""}</p>)}
        </div>
        <div id="growth" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Learning growth summary</h2>
          <p className="mt-2 text-sm text-slate-700">Progress score: {Math.min(100, (checklist?.progress ?? 0) + logbooks.length * 3)} / 100</p>
          <p className="mt-2 text-sm text-slate-700">Trend keywords: {growthSummary(logbooks.map((l) => l.summary)) || "insufficient data"}</p>
          <p className="mt-1 text-sm text-slate-700">Weekly logs submitted: {logbooks.length}</p>
        </div>
      </section>
    </AppShell>
  );
}
