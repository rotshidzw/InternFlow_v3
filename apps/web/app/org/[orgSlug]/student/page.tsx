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

  const applications = await prisma.application.findMany({ where: { userId: access.user.id, opportunity: { organizationId: access.membership.organizationId } }, include: { opportunity: true, checklist: { include: { items: true } } }, orderBy: { createdAt: "desc" } });
  const logbooks = await prisma.logbookEntry.findMany({ where: { userId: access.user.id }, orderBy: { createdAt: "desc" }, take: 8 });
  const docs = await prisma.document.findMany({ where: { userId: access.user.id }, take: 8, orderBy: { createdAt: "desc" } });
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
      <h1 className="text-2xl font-semibold">Student lifecycle dashboard</h1>
      <div id="overview" className="mt-4 grid gap-3 md:grid-cols-3">
        <section className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-300">Onboarding progress</p>
          <p className="mt-2 text-4xl font-bold text-emerald-300">{checklist?.progress ?? 0}%</p>
          <p className="mt-2 text-sm">Next task: {nextTask?.label ?? "All done"}</p>
          <p className="text-sm text-amber-300">Overdue items: {overdue}</p>
        </section>
        <section id="applications" className="rounded-xl border border-white/15 bg-white/5 p-4 md:col-span-2">
          <p className="text-xs uppercase text-slate-300">Applications timeline</p>
          {applications.map((a) => <p key={a.id} className="mt-2 text-sm">{a.opportunity.title} · {a.status}</p>)}
        </section>
      </div>

      <section id="checklist" className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Checklist actions</h2>
        <div className="mt-2 space-y-2">
          {checklist?.items.map((item) => (
            <form key={item.id} action={`/api/checklist/items/${item.id}/complete`} method="post" className="flex items-center justify-between rounded-lg border border-white/10 p-2 text-sm">
              <span>{item.label} · {item.status}</span>
              <button disabled={item.status === "DONE"} className="rounded bg-emerald-500 px-3 py-1 text-slate-950 disabled:opacity-50">Complete</button>
            </form>
          ))}
        </div>
      </section>

      <section id="weekly-goals" className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Weekly goals tracker</h2>
        <p className="mt-1 text-sm text-slate-200">Week window: {currentWeekStart.toISOString().slice(0, 10)} to {currentWeekEnd.toISOString().slice(0, 10)} · completed {weeklyCompleted}/{weeklyGoals.length}</p>
        <div className="mt-2 space-y-2 text-sm">
          {weeklyGoals.length === 0 ? <p className="text-slate-300">No goals configured for this week yet.</p> : weeklyGoals.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 p-2">
              <span>{item.label}</span>
              <span className={item.status === "DONE" ? "text-emerald-300" : "text-amber-300"}>{item.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-4 md:col-span-2">
          <h2 className="font-semibold text-emerald-200">Student-only workspace access</h2>
          <p className="mt-1 text-sm text-emerald-100/90">You are in student mode. Admin/coordinator/provider areas are restricted for your account.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <a href="#applications" className="rounded border border-white/20 px-3 py-1.5 hover:bg-white/10">Jump to applications</a>
            <a href="#checklist" className="rounded border border-white/20 px-3 py-1.5 hover:bg-white/10">Jump to checklist</a>
            <a href="#documents" className="rounded border border-white/20 px-3 py-1.5 hover:bg-white/10">Jump to documents</a>
            <a href="#weekly-goals" className="rounded border border-white/20 px-3 py-1.5 hover:bg-white/10">Jump to weekly goals</a>
          </div>
        </div>
        <div id="documents" className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Document vault + payslips</h2>
          {docs.map((d) => <p key={d.id} className="mt-1 text-sm">{d.type} · {d.status} {d.expirationDate ? `· expires ${d.expirationDate.toISOString().slice(0, 10)}` : ""}</p>)}
        </div>
        <div id="growth" className="rounded-xl border border-white/15 bg-white/5 p-4">
          <h2 className="font-semibold">Learning growth summary</h2>
          <p className="mt-2 text-sm text-slate-200">Progress score: {Math.min(100, (checklist?.progress ?? 0) + logbooks.length * 3)} / 100</p>
          <p className="mt-2 text-sm">Trend keywords: {growthSummary(logbooks.map((l) => l.summary)) || "insufficient data"}</p>
          <p className="mt-1 text-sm">Weekly logs submitted: {logbooks.length}</p>
        </div>
      </section>
    </AppShell>
  );
}
