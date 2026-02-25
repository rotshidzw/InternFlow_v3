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
    prisma.enrollment.findMany({ where: { organizationId: orgId } , include: { user: true, program: true }, take: 100 }),
    prisma.logbookEntry.findMany({ where: { user: { memberships: { some: { organizationId: orgId } } } }, include: { user: true }, orderBy: { weekStart: "desc" }, take: 500 }),
    prisma.checklistInstance.findMany({ where: { application: { opportunity: { organizationId: orgId } } }, include: { application: { include: { user: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 200 })
  ]);

  const progressRows = enrollments.map((enrollment) => {
    const learnerLogs = logbooks.filter((entry) => entry.userId === enrollment.userId);
    const learnerChecklist = checklists.find((item) => item.application.userId === enrollment.userId);
    const completedGoals = learnerChecklist?.items.filter((i) => i.status === "DONE").length ?? 0;
    const totalGoals = learnerChecklist?.items.length ?? 0;

    return {
      learnerId: enrollment.userId,
      learnerName: enrollment.user.name ?? enrollment.user.email,
      programme: enrollment.program.name,
      status: enrollment.status,
      checklistProgress: learnerChecklist?.progress ?? 0,
      weeklyLogs: learnerLogs.length,
      latestWeek: learnerLogs[0] ? weekKey(learnerLogs[0].weekStart) : "No logs",
      goals: `${completedGoals}/${totalGoals}`
    };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Learner progress tracker</h1>
        <p className="text-sm text-slate-600">Weekly growth board per learner: checklist goals, logbook cadence, and latest activity.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
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
              <tr key={`${row.learnerId}-${row.programme}`} className="border-t border-slate-100">
                <td className="p-2 font-medium">{row.learnerName}</td>
                <td className="p-2">{row.programme}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.checklistProgress}%</td>
                <td className="p-2">{row.goals}</td>
                <td className="p-2">{row.weeklyLogs}</td>
                <td className="p-2">{row.latestWeek}</td>
                <td className="p-2"><Link className="text-blue-600" href={`/org/${params.orgSlug}/app/learners/${row.learnerId}`}>Open learner</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
