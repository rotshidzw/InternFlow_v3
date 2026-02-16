import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export default async function TenantDashboardPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;

  const [programs, opportunities, applications, enrollments, docs, approvalsPending, recentApps, recentLogs, recentAudits, onboardingProgress] =
    await Promise.all([
      prisma.program.count({ where: { organizationId: orgId } }),
      prisma.opportunity.count({ where: { organizationId: orgId } }),
      prisma.application.findMany({
        where: { opportunity: { organizationId: orgId } },
        select: { id: true, status: true, createdAt: true }
      }),
      prisma.enrollment.findMany({ where: { organizationId: orgId }, select: { status: true, stipendPaid: true } }),
      prisma.document.findMany({ where: { organizationId: orgId }, select: { status: true, expirationDate: true } }),
      prisma.logbookApproval.count({ where: { status: "PENDING", entry: { user: { memberships: { some: { organizationId: orgId } } } } } }),
      prisma.application.findMany({
        where: { opportunity: { organizationId: orgId } },
        include: { user: true, opportunity: true },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.logbookEntry.findMany({
        where: { user: { memberships: { some: { organizationId: orgId } } } },
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.auditLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 8, include: { actor: true } }),
      prisma.checklistInstance.findMany({ where: { application: { opportunity: { organizationId: orgId } } }, select: { progress: true } })
    ]);

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE").length;
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED").length;
  const paidStipends = enrollments.filter((e) => e.stipendPaid).length;

  const appByStatus = {
    APPLIED: applications.filter((a) => a.status === "APPLIED").length,
    SHORTLISTED: applications.filter((a) => a.status === "SHORTLISTED").length,
    ACCEPTED: applications.filter((a) => a.status === "ACCEPTED").length,
    REJECTED: applications.filter((a) => a.status === "REJECTED").length
  };

  const needsAttentionDocs = docs.filter((d) => ["SCAN_FAILED", "SCAN_PENDING"].includes(d.status) || (d.expirationDate && d.expirationDate < new Date())).length;
  const validDocs = docs.length - needsAttentionDocs;
  const compliancePct = pct(validDocs, docs.length);

  const last14 = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const appTrend = last14.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const count = applications.filter((a) => a.createdAt.toISOString().slice(0, 10) === key).length;
    return { label: d.toISOString().slice(5, 10), count };
  });

  const totalApps14d = appTrend.reduce((sum, day) => sum + day.count, 0);
  const todayApps = appTrend.at(-1)?.count ?? 0;
  const maxTrend = Math.max(1, ...appTrend.map((x) => x.count));

  const points = appTrend
    .map((d, i) => {
      const x = (i / (appTrend.length - 1)) * 100;
      const y = 100 - (d.count / maxTrend) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const area = `0,100 ${points} 100,100`;

  const onboardingStarted = onboardingProgress.filter((c) => c.progress > 0).length;
  const onboardingComplete = onboardingProgress.filter((c) => c.progress >= 100).length;
  const onboardingInProgress = onboardingProgress.filter((c) => c.progress > 0 && c.progress < 100).length;
  const avgOnboardingProgress = onboardingProgress.length ? Math.round(onboardingProgress.reduce((sum, c) => sum + c.progress, 0) / onboardingProgress.length) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">Tenant Home</h1>
        <p className="text-sm text-slate-600">Manage recruitment, compliance, learner progression, and stipend delivery from one command center.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href={`/org/${params.orgSlug}/app/programs`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs text-slate-500">Programs</p>
          <p className="mt-2 text-3xl font-semibold">{programs}</p>
        </Link>
        <Link href={`/org/${params.orgSlug}/app/opportunities`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs text-slate-500">Opportunities</p>
          <p className="mt-2 text-3xl font-semibold">{opportunities}</p>
        </Link>
        <Link href={`/org/${params.orgSlug}/app/enrollments`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs text-slate-500">Active learners</p>
          <p className="mt-2 text-3xl font-semibold">{activeEnrollments}</p>
        </Link>
        <Link href={`/org/${params.orgSlug}/app/approvals`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs text-slate-500">Pending approvals</p>
          <p className="mt-2 text-3xl font-semibold">{approvalsPending}</p>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Applications trend (14 days)</h2>
            <Link href={`/org/${params.orgSlug}/app/applicants`} className="text-xs text-blue-600">
              Open pipeline →
            </Link>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">Total applications (14d)</p>
              <p className="text-lg font-semibold text-slate-900">{totalApps14d}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">Today</p>
              <p className="text-lg font-semibold text-slate-900">{todayApps}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">Peak day</p>
              <p className="text-lg font-semibold text-slate-900">{maxTrend}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-blue-50/40 p-3">
            <svg viewBox="0 0 100 100" className="h-44 w-full" preserveAspectRatio="none" role="img" aria-label="Applications trend chart">
              <line x1="0" y1="100" x2="100" y2="100" stroke="#cbd5e1" strokeWidth="0.6" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#e2e8f0" strokeWidth="0.4" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.4" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#e2e8f0" strokeWidth="0.4" />
              <polygon points={area} fill="rgba(59,130,246,0.15)" />
              <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-2 grid grid-cols-7 gap-2 text-[11px] text-slate-500">
              {appTrend
                .filter((_, i) => i % 2 === 0)
                .map((d) => (
                  <p key={d.label} className="text-center">
                    {d.label}
                  </p>
                ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="font-semibold">Compliance pulse</h2>
          <p className="mt-2 text-4xl font-semibold">{compliancePct}%</p>
          <p className="text-xs text-slate-500">valid docs</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${compliancePct}%` }} />
          </div>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>Valid docs: {validDocs}</p>
            <p>Needs review: {needsAttentionDocs}</p>
            <p>Completed enrollments: {completedEnrollments}</p>
            <p>Stipends paid: {paidStipends}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="font-semibold">Recruitment pipeline</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(appByStatus).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span>{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Onboarding process</h2>
            <Link href={`/org/${params.orgSlug}/app/approvals`} className="text-xs text-blue-600">
              Track progress
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span>Accepted applicants</span>
              <span className="font-semibold">{appByStatus.ACCEPTED}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span>Started onboarding</span>
              <span className="font-semibold">{onboardingStarted}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span>In progress</span>
              <span className="font-semibold">{onboardingInProgress}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span>Completed onboarding</span>
              <span className="font-semibold">{onboardingComplete}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Average onboarding completion: {avgOnboardingProgress}%</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${avgOnboardingProgress}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Latest applicants</h2>
            <Link href={`/org/${params.orgSlug}/app/applicants`} className="text-xs text-blue-600">
              View all
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            {recentApps.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="font-medium">{a.user.email}</p>
                <p className="text-slate-500">
                  {a.opportunity.title} · {a.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recent learner activity</h2>
            <Link href={`/org/${params.orgSlug}/app/logbooks`} className="text-xs text-blue-600">
              Logbooks
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            {recentLogs.map((l) => (
              <div key={l.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="font-medium">{l.user.email}</p>
                <p className="text-slate-500">
                  {l.weekStart.toISOString().slice(0, 10)} · {l.summary.slice(0, 54)}...
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recent system events</h2>
            <Link href={`/org/${params.orgSlug}/app/reports`} className="text-xs text-blue-600">
              Reports & exports
            </Link>
          </div>
          <div className="space-y-2">
            {recentAudits.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium">{a.action.replaceAll("_", " ")}</p>
                <p className="text-slate-500">
                  {a.actor?.email ?? "system"} · {a.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
