import { prisma } from "@internflow/db/src";
import Link from "next/link";
import type { Route } from "next";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { BrandImagePanel } from "@/components/visual/brand-image-panel";
import { brandImagery } from "@/lib/brand-imagery";
import { listTenantBoundLogbookEntryIds } from "@/lib/logbook-tenant-binding";

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export default async function TenantDashboardPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const orgId = access.membership.organizationId;
  const boundLogbookEntryIds = await listTenantBoundLogbookEntryIds(orgId);

  const [
    programs,
    opportunities,
    applications,
    enrollments,
    docs,
    approvalsPending,
    recentApps,
    recentLogs,
    recentAudits,
    onboardingProgress,
    registersThisMonth,
    issuedCertificates,
  ] = await Promise.all([
    prisma.program.count({ where: { organizationId: orgId } }),
    prisma.opportunity.count({ where: { organizationId: orgId } }),
    prisma.application.findMany({
      where: { opportunity: { organizationId: orgId } },
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.enrollment.findMany({
      where: { organizationId: orgId },
      select: { status: true, stipendPaid: true },
    }),
    prisma.document.findMany({
      where: { organizationId: orgId },
      select: { status: true, expirationDate: true },
    }),
    boundLogbookEntryIds.length
      ? prisma.logbookApproval.count({
          where: {
            status: "PENDING",
            entryId: { in: boundLogbookEntryIds },
          },
        })
      : Promise.resolve(0),
    prisma.application.findMany({
      where: { opportunity: { organizationId: orgId } },
      include: { user: true, opportunity: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    boundLogbookEntryIds.length
      ? prisma.logbookEntry.findMany({
          where: { id: { in: boundLogbookEntryIds } },
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]),
    prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: true },
    }),
    prisma.checklistInstance.findMany({
      where: { application: { opportunity: { organizationId: orgId } } },
      select: { progress: true },
    }),
    prisma.organizationDocument.count({
      where: {
        orgId,
        category: "ATTENDANCE_REGISTER",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.document.count({
      where: { organizationId: orgId, type: "CERTIFICATE" },
    }),
  ]);

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE").length;
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED").length;
  const paidStipends = enrollments.filter((e) => e.stipendPaid).length;

  const appByStatus = {
    APPLIED: applications.filter((a) => a.status === "APPLIED").length,
    SHORTLISTED: applications.filter((a) => a.status === "SHORTLISTED").length,
    ACCEPTED: applications.filter((a) => a.status === "ACCEPTED").length,
    REJECTED: applications.filter((a) => a.status === "REJECTED").length,
  };

  const needsAttentionDocs = docs.filter(
    (d) =>
      ["SCAN_FAILED", "SCAN_PENDING"].includes(d.status) ||
      (d.expirationDate && d.expirationDate < new Date()),
  ).length;
  const validDocs = docs.length - needsAttentionDocs;
  const compliancePct = pct(validDocs, docs.length);
  const paymentsDue = enrollments.filter((e) => e.status === "ACTIVE" && !e.stipendPaid).length;
  const certificateBacklog = Math.max(0, completedEnrollments - issuedCertificates);
  const missingAttendance = activeEnrollments > 0 && registersThisMonth === 0 ? activeEnrollments : 0;
  const auditGaps =
    needsAttentionDocs + paymentsDue + certificateBacklog + (registersThisMonth === 0 ? 1 : 0);

  const last14 = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const appTrend = last14.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const count = applications.filter((a) => a.createdAt.toISOString().slice(0, 10) === key).length;
    return { label: date.toISOString().slice(5, 10), count };
  });

  const totalApps14d = appTrend.reduce((sum, day) => sum + day.count, 0);
  const todayApps = appTrend.at(-1)?.count ?? 0;
  const maxTrend = Math.max(1, ...appTrend.map((x) => x.count));
  const previous7 = appTrend.slice(0, 7).reduce((sum, day) => sum + day.count, 0);
  const trailing7 = appTrend.slice(-7).reduce((sum, day) => sum + day.count, 0);
  const trendDelta = trailing7 - previous7;

  const points = appTrend
    .map((day, i) => {
      const x = (i / (appTrend.length - 1)) * 100;
      const y = 100 - (day.count / maxTrend) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,100 ${points} 100,100`;

  const onboardingStarted = onboardingProgress.filter((c) => c.progress > 0).length;
  const onboardingComplete = onboardingProgress.filter((c) => c.progress >= 100).length;
  const onboardingInProgress = onboardingProgress.filter((c) => c.progress > 0 && c.progress < 100).length;
  const avgOnboardingProgress = onboardingProgress.length
    ? Math.round(onboardingProgress.reduce((sum, c) => sum + c.progress, 0) / onboardingProgress.length)
    : 0;

  const applicationsTotal = applications.length;
  const shortlistingRate = pct(appByStatus.SHORTLISTED + appByStatus.ACCEPTED, applicationsTotal);
  const acceptanceRate = pct(appByStatus.ACCEPTED, applicationsTotal);
  const stipendCoverage = pct(paidStipends, activeEnrollments);
  const attendanceCoverage =
    activeEnrollments === 0
      ? 100
      : clamp(Math.round((Math.min(registersThisMonth, activeEnrollments) / activeEnrollments) * 100));
  const onboardingCompletionRate = pct(onboardingComplete, Math.max(appByStatus.ACCEPTED, 1));
  const readinessScore = clamp(
    Math.round(
      compliancePct * 0.35 +
        stipendCoverage * 0.2 +
        attendanceCoverage * 0.2 +
        onboardingCompletionRate * 0.15 +
        acceptanceRate * 0.1 -
        auditGaps * 1.25,
    ),
  );

  const complianceRadius = 37;
  const ringLength = 2 * Math.PI * complianceRadius;
  const complianceOffset = ringLength * (1 - compliancePct / 100);
  const stipendOffset = ringLength * (1 - stipendCoverage / 100);

  const statusDistribution = [
    { key: "Applied", value: appByStatus.APPLIED, tone: "from-cyan-400/85 to-sky-500/85" },
    { key: "Shortlisted", value: appByStatus.SHORTLISTED, tone: "from-violet-400/85 to-purple-500/85" },
    { key: "Accepted", value: appByStatus.ACCEPTED, tone: "from-emerald-400/85 to-green-500/85" },
    { key: "Rejected", value: appByStatus.REJECTED, tone: "from-rose-400/85 to-red-500/85" },
  ];

  const flowStages = [
    { label: "Recruitment", value: applicationsTotal, helper: "Applications in pipeline" },
    { label: "Shortlisting", value: appByStatus.SHORTLISTED, helper: "Review and screening" },
    { label: "Onboarding", value: onboardingStarted, helper: "Checklist started" },
    { label: "Active Delivery", value: activeEnrollments, helper: "Learners in programme" },
    { label: "Completion", value: completedEnrollments, helper: "Ready for close-out" },
  ];

  const attentionBlocks = [
    {
      label: "Pending docs",
      value: needsAttentionDocs,
      note: "Verification and scan queue",
      href: `/org/${params.orgSlug}/app/documents`,
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    },
    {
      label: "Missing attendance",
      value: missingAttendance,
      note: "Monthly register evidence needed",
      href: `/org/${params.orgSlug}/app/registers`,
      tone: "border-rose-500/30 bg-rose-500/10 text-rose-100",
    },
    {
      label: "Payments due",
      value: paymentsDue,
      note: "Active learners awaiting payout",
      href: `/org/${params.orgSlug}/app/stipends`,
      tone: "border-sky-500/30 bg-sky-500/10 text-sky-100",
    },
    {
      label: "Certificate backlog",
      value: certificateBacklog,
      note: "Completion awaiting issuance",
      href: `/org/${params.orgSlug}/app/certificates`,
      tone: "border-violet-500/30 bg-violet-500/10 text-violet-100",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="if-panel relative overflow-hidden rounded-3xl p-6">
          <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden>
            <div className="absolute -right-20 top-[-85px] h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="absolute -bottom-24 left-[-80px] h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          </div>
          <div className="relative space-y-5">
            <div className="space-y-2">
              <p className="if-marketing-eyebrow text-brand-accentStrong">Tenant Command Center</p>
              <h1 className="if-page-title">Programme Operations Home</h1>
              <p className="if-page-subtitle max-w-2xl">
                Coordinate recruitment, onboarding, attendance, compliance, stipends, certificates,
                and follow-up from a single operational view built for daily execution.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link href={`/org/${params.orgSlug}/app/learner-chat`} className="if-panel-muted rounded-xl px-3 py-2 text-sm transition hover:border-brand-accent/40 hover:bg-brand-surface">
                <p className="if-meta-text">Conversations</p>
                <p className="if-body-text mt-1 font-medium text-brand-text">Chat with learners</p>
              </Link>
              <Link href={`/org/${params.orgSlug}/app/progress`} className="if-panel-muted rounded-xl px-3 py-2 text-sm transition hover:border-brand-accent/40 hover:bg-brand-surface">
                <p className="if-meta-text">Progress</p>
                <p className="if-body-text mt-1 font-medium text-brand-text">Track programme flow</p>
              </Link>
              <Link href={`/org/${params.orgSlug}/app/registers`} className="if-panel-muted rounded-xl px-3 py-2 text-sm transition hover:border-brand-accent/40 hover:bg-brand-surface">
                <p className="if-meta-text">Registers</p>
                <p className="if-body-text mt-1 font-medium text-brand-text">Attendance and sign-off</p>
              </Link>
              <Link href={`/org/${params.orgSlug}/app/certificates`} className="if-panel-muted rounded-xl px-3 py-2 text-sm transition hover:border-brand-accent/40 hover:bg-brand-surface">
                <p className="if-meta-text">Certificates</p>
                <p className="if-body-text mt-1 font-medium text-brand-text">Release and follow-up</p>
              </Link>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {attentionBlocks.map((block) => (
                <Link
                  key={block.label}
                  href={block.href as Route}
                  className={`rounded-xl border px-3 py-2 transition hover:brightness-110 ${block.tone}`}
                >
                  <p className="text-[11px] uppercase tracking-[0.14em]">{block.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{block.value}</p>
                  <p className="text-xs opacity-85">{block.note}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <BrandImagePanel
          image={brandImagery.roleBasedOperations}
          eyebrow="Operations Lens"
          title="One coordinated surface for every role"
          description="Recruitment, compliance, finance, and learner delivery remain connected through one shared operating model."
          imageClassName="h-full min-h-[21rem]"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href={`/org/${params.orgSlug}/app/programs`}
          className="if-panel group rounded-2xl border border-brand-border/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-accent/40"
        >
          <p className="if-kpi-label">Programmes</p>
          <p className="if-kpi-value mt-2">{programs}</p>
          <p className="if-caption-text mt-1">Configured delivery tracks</p>
        </Link>
        <Link
          href={`/org/${params.orgSlug}/app/opportunities`}
          className="if-panel group rounded-2xl border border-brand-border/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-accent/40"
        >
          <p className="if-kpi-label">Opportunities</p>
          <p className="if-kpi-value mt-2">{opportunities}</p>
          <p className="if-caption-text mt-1">Open application channels</p>
        </Link>
        <Link
          href={`/org/${params.orgSlug}/app/enrollments`}
          className="if-panel group rounded-2xl border border-brand-border/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-accent/40"
        >
          <p className="if-kpi-label">Active learners</p>
          <p className="if-kpi-value mt-2">{activeEnrollments}</p>
          <p className="if-caption-text mt-1">{completedEnrollments} completed cohorts</p>
        </Link>
        <Link
          href={`/org/${params.orgSlug}/app/approvals`}
          className="if-panel group rounded-2xl border border-brand-border/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-accent/40"
        >
          <p className="if-kpi-label">Pending approvals</p>
          <p className="if-kpi-value mt-2">{approvalsPending}</p>
          <p className="if-caption-text mt-1">Supervisor and coordinator actions</p>
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="if-panel rounded-3xl border border-brand-border/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="if-marketing-eyebrow text-brand-accentStrong">Recruitment Signal</p>
              <h2 className="if-panel-title mt-1">Applications trend (14 days)</h2>
            </div>
            <Link href={`/org/${params.orgSlug}/app/applicants`} className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Open pipeline
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="if-panel-muted rounded-lg px-3 py-2">
              <p className="if-kpi-label">Total (14d)</p>
              <p className="mt-1 text-xl font-semibold text-brand-text">{totalApps14d}</p>
            </div>
            <div className="if-panel-muted rounded-lg px-3 py-2">
              <p className="if-kpi-label">Today</p>
              <p className="mt-1 text-xl font-semibold text-brand-text">{todayApps}</p>
            </div>
            <div className="if-panel-muted rounded-lg px-3 py-2">
              <p className="if-kpi-label">Peak day</p>
              <p className="mt-1 text-xl font-semibold text-brand-text">{maxTrend}</p>
            </div>
            <div className="if-panel-muted rounded-lg px-3 py-2">
              <p className="if-kpi-label">7d momentum</p>
              <p className={`mt-1 text-xl font-semibold ${trendDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {trendDelta >= 0 ? "+" : "-"}
                {Math.abs(trendDelta)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-brand-border/60 bg-[#0b1126]/85 p-3">
            <svg viewBox="0 0 100 100" className="h-48 w-full" preserveAspectRatio="none" role="img" aria-label="Applications trend chart">
              <defs>
                <linearGradient id="appsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(130,146,190,0.22)" strokeWidth="0.5" />
              ))}
              <polygon points={area} fill="url(#appsAreaGradient)" />
              <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              {appTrend.map((day, idx) => {
                const x = (idx / Math.max(1, appTrend.length - 1)) * 100;
                const y = 100 - (day.count / maxTrend) * 100;
                return (
                  <circle key={day.label} cx={x} cy={y} r="1.3" fill="#b794ff">
                    <title>{`${day.label}: ${day.count}`}</title>
                  </circle>
                );
              })}
            </svg>
            <div className="mt-2 grid grid-cols-7 gap-1 text-[11px] text-brand-muted">
              {appTrend.filter((_, idx) => idx % 2 === 0).map((day) => (
                <p key={day.label} className="text-center">
                  {day.label}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {statusDistribution.map((item) => {
              const width = clamp(pct(item.value, Math.max(1, applicationsTotal)));
              return (
                <div key={item.key} className="if-panel-muted rounded-lg px-3 py-2">
                  <div className="mb-1 flex items-center justify-between text-xs text-brand-textSoft">
                    <span>{item.key}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#111a36]">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${item.tone}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="if-panel rounded-3xl border border-brand-border/70 p-5">
            <p className="if-marketing-eyebrow text-brand-accentStrong">Compliance Pulse</p>
            <div className="mt-3 flex items-center gap-4">
              <svg viewBox="0 0 100 100" className="h-24 w-24">
                <circle cx="50" cy="50" r={complianceRadius} stroke="rgba(126,143,189,0.28)" strokeWidth="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r={complianceRadius}
                  stroke="#8b5cf6"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={ringLength}
                  strokeDashoffset={complianceOffset}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div>
                <p className="text-3xl font-semibold text-brand-text">{compliancePct}%</p>
                <p className="text-xs text-brand-textSoft">Document compliance signal</p>
                <p className="mt-1 text-xs text-brand-muted">
                  {validDocs} valid - {needsAttentionDocs} needing action
                </p>
              </div>
            </div>
          </div>

          <div className="if-panel rounded-3xl border border-brand-border/70 p-5">
            <p className="if-marketing-eyebrow text-brand-accentStrong">Stipend Delivery</p>
            <div className="mt-3 flex items-center gap-4">
              <svg viewBox="0 0 100 100" className="h-24 w-24">
                <circle cx="50" cy="50" r={complianceRadius} stroke="rgba(126,143,189,0.28)" strokeWidth="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r={complianceRadius}
                  stroke="#22d3ee"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={ringLength}
                  strokeDashoffset={stipendOffset}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div>
                <p className="text-3xl font-semibold text-brand-text">{stipendCoverage}%</p>
                <p className="text-xs text-brand-textSoft">Stipends paid for active learners</p>
                <p className="mt-1 text-xs text-brand-muted">
                  {paidStipends} paid - {paymentsDue} pending
                </p>
              </div>
            </div>
          </div>

          <div className="if-panel rounded-3xl border border-brand-border/70 p-5">
            <p className="if-marketing-eyebrow text-brand-accentStrong">Operational Readiness</p>
            <p className="mt-2 text-4xl font-semibold text-brand-text">{readinessScore}%</p>
            <p className="text-xs text-brand-textSoft">Composite readiness based on compliance, onboarding, attendance, and payout controls.</p>
            <p className="mt-1 text-xs text-brand-muted">Audit gaps currently flagged: {auditGaps}</p>
            <div className="mt-3 h-2 rounded-full bg-[#111a36]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
                style={{ width: `${readinessScore}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="if-panel rounded-3xl border border-brand-border/70 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="if-marketing-eyebrow text-brand-accentStrong">Operational Flow</p>
            <h2 className="if-panel-title mt-1">Recruitment to completion lifecycle</h2>
          </div>
          <p className="text-xs text-brand-muted">
            Shortlisting {shortlistingRate}% - Acceptance {acceptanceRate}% - Onboarding {avgOnboardingProgress}% avg
          </p>
        </div>
        <div className="grid gap-2 lg:grid-cols-5">
          {flowStages.map((stage, idx) => (
            <div key={stage.label} className="if-panel-muted relative rounded-xl px-3 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brand-muted">{stage.label}</p>
              <p className="mt-1 text-2xl font-semibold text-brand-text">{stage.value}</p>
              <p className="text-xs text-brand-textSoft">{stage.helper}</p>
              {idx < flowStages.length - 1 ? (
                <span
                  className="pointer-events-none absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-gradient-to-r from-violet-400/70 to-cyan-400/70 lg:block"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="if-panel rounded-3xl border border-brand-border/70 p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="if-panel-title">Latest applicants</h2>
            <Link href={`/org/${params.orgSlug}/app/applicants`} className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentApps.map((app) => (
              <div key={app.id} className="if-panel-muted rounded-xl border border-brand-border/60 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-brand-text">{app.user.email}</p>
                  <span className="if-status if-status-draft">{app.status}</span>
                </div>
                <p className="text-xs text-brand-textSoft">
                  {app.opportunity.title} - {app.createdAt.toISOString().slice(0, 10)}
                </p>
              </div>
            ))}
            {recentApps.length === 0 ? (
              <p className="text-sm text-brand-muted">No recent applicants found.</p>
            ) : null}
          </div>
        </div>

        <div className="if-panel rounded-3xl border border-brand-border/70 p-5">
          <h2 className="if-panel-title">Onboarding status</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="if-panel-muted flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-brand-textSoft">Accepted applicants</span>
              <span className="font-semibold text-brand-text">{appByStatus.ACCEPTED}</span>
            </div>
            <div className="if-panel-muted flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-brand-textSoft">Started onboarding</span>
              <span className="font-semibold text-brand-text">{onboardingStarted}</span>
            </div>
            <div className="if-panel-muted flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-brand-textSoft">In progress</span>
              <span className="font-semibold text-brand-text">{onboardingInProgress}</span>
            </div>
            <div className="if-panel-muted flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-brand-textSoft">Completed onboarding</span>
              <span className="font-semibold text-brand-text">{onboardingComplete}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-brand-muted">
            Attendance coverage {attendanceCoverage}% - Registers this month {registersThisMonth}
          </p>
          <div className="mt-2 h-2 rounded-full bg-[#111a36]">
            <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${avgOnboardingProgress}%` }} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="if-panel rounded-3xl border border-brand-border/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="if-panel-title">Recent learner activity</h2>
            <Link href={`/org/${params.orgSlug}/app/logbooks`} className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Logbooks
            </Link>
          </div>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="if-panel-muted rounded-xl border border-brand-border/60 px-3 py-2 text-sm">
                <p className="font-medium text-brand-text">{log.user.email}</p>
                <p className="text-xs text-brand-textSoft">
                  Week {log.weekStart.toISOString().slice(0, 10)} - {log.summary.slice(0, 68)}...
                </p>
              </div>
            ))}
            {recentLogs.length === 0 ? (
              <p className="text-sm text-brand-muted">No recent learner log activity.</p>
            ) : null}
          </div>
        </div>

        <div className="if-panel rounded-3xl border border-brand-border/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="if-panel-title">Recent system events</h2>
            <Link href={`/org/${params.orgSlug}/app/reports`} className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Reports and exports
            </Link>
          </div>
          <div className="space-y-2">
            {recentAudits.map((audit) => (
              <div key={audit.id} className="if-panel-muted rounded-xl border border-brand-border/60 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-brand-text">{audit.action.replaceAll("_", " ")}</p>
                  <span className="if-status if-status-pending">Event</span>
                </div>
                <p className="text-xs text-brand-textSoft">
                  {(audit.actor?.email ?? "system")} - {audit.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                </p>
              </div>
            ))}
            {recentAudits.length === 0 ? (
              <p className="text-sm text-brand-muted">No recent audit events.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
