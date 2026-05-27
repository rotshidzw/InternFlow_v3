import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

function weekKey(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function ProgressPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const [enrollments, logbooks, checklists] = await Promise.all([
    prisma.enrollment.findMany({ where: { organizationId: orgId }, include: { user: true, program: true }, take: 100 }),
    prisma.logbookEntry.findMany({ where: { user: { memberships: { some: { organizationId: orgId } } } }, include: { user: true }, orderBy: { weekStart: "desc" }, take: 500 }),
    prisma.checklistInstance.findMany({ where: { application: { opportunity: { organizationId: orgId } } }, include: { application: { include: { user: true } }, items: true }, orderBy: { applicationId: "desc" }, take: 200 }),
  ]);

  const progressRows = enrollments.map((enrollment) => {
    const learnerLogs = logbooks.filter((entry) => entry.userId === enrollment.userId);
    const learnerChecklist = checklists.find((item) => item.application.userId === enrollment.userId);
    const completedGoals = learnerChecklist?.items.filter((item) => item.status === "DONE").length ?? 0;
    const totalGoals = learnerChecklist?.items.length ?? 0;

    return {
      learnerId: enrollment.userId,
      learnerName: enrollment.user.name ?? enrollment.user.email,
      programme: enrollment.program.name,
      status: enrollment.status,
      checklistProgress: learnerChecklist?.progress ?? 0,
      weeklyLogs: learnerLogs.length,
      latestWeek: learnerLogs[0] ? weekKey(learnerLogs[0].weekStart) : "No logs",
      goals: `${completedGoals}/${totalGoals}`,
    };
  });

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Delivery Analytics</p>
        <h1 className="if-auth-title mt-2">Learner progress tracker</h1>
        <p className="if-auth-subtitle">
          Weekly growth view per learner: checklist goals, logbook cadence, and latest activity windows.
        </p>
      </section>

      <div className="if-auth-table-wrap">
        <table className="if-table-hover min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Learner</th>
              <th className="p-2">Programme</th>
              <th className="p-2">Status</th>
              <th className="p-2">Checklist</th>
              <th className="p-2">Weekly goals done</th>
              <th className="p-2">Logbooks</th>
              <th className="p-2">Latest week</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {progressRows.map((row) => (
              <tr key={`${row.learnerId}-${row.programme}`} className="border-t border-brand-border/50">
                <td className="p-2 font-medium text-brand-text">{row.learnerName}</td>
                <td className="p-2 text-brand-textSoft">{row.programme}</td>
                <td className="p-2 text-brand-textSoft">{row.status}</td>
                <td className="p-2 text-brand-textSoft">{row.checklistProgress}%</td>
                <td className="p-2 text-brand-textSoft">{row.goals}</td>
                <td className="p-2 text-brand-textSoft">{row.weeklyLogs}</td>
                <td className="p-2 text-brand-textSoft">{row.latestWeek}</td>
                <td className="p-2">
                  <Link className="if-btn if-btn-secondary px-2 py-1 text-xs" href={`/org/${params.orgSlug}/app/learners/${row.learnerId}`}>
                    Open learner
                  </Link>
                </td>
              </tr>
            ))}
            {progressRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-brand-muted">
                  No progress records available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
