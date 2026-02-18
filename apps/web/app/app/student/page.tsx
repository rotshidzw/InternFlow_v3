import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

type StudentPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function StudentPortalPage({ searchParams }: StudentPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const tenantContext = await resolveStudentTenantContext(user.id);

  const [profile, docs, applications, opportunities, logbooks, threads] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.document.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.application.findMany({
      where: { userId: user.id },
      include: { opportunity: { include: { organization: true } }, checklist: { include: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.opportunity.findMany({ where: { status: "PUBLISHED" }, include: { organization: true }, orderBy: { id: "desc" }, take: 8 }),
    prisma.logbookEntry.findMany({ where: { userId: user.id }, include: { approvals: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.chatThread.findMany({ where: { userId: user.id }, include: { messages: { orderBy: { createdAt: "desc" }, take: 4 } }, orderBy: { createdAt: "desc" }, take: 2 })
  ]);

  const profileSignals = [Boolean(user.name), Boolean(profile?.phone), Boolean(profile?.education), Boolean(profile?.emergencyContact), docs.length > 0];
  const employabilityScore = Math.round((profileSignals.filter(Boolean).length / profileSignals.length) * 100);

  const submitted = applications.filter((a) => ["APPLIED", "SUBMITTED", "DRAFT", "REVIEW"].includes(a.status)).length;
  const shortlisted = applications.filter((a) => a.status === "SHORTLISTED").length;
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;

  const now = new Date();
  const expiringSoon = docs.filter((d) => d.expirationDate && d.expirationDate > now && d.expirationDate.getTime() - now.getTime() <= 90 * 24 * 60 * 60 * 1000).length;
  const expired = docs.filter((d) => d.expirationDate && d.expirationDate < now).length;

  const latestChecklist = applications.find((app) => app.checklist)?.checklist;
  const checklistItems = latestChecklist?.items ?? [];
  const checklistDone = checklistItems.filter((item) => item.status === "DONE").length;
  const checklistProgress = latestChecklist?.progress ?? pct(checklistDone, checklistItems.length);
  const nextActions = checklistItems.filter((item) => item.status !== "DONE").slice(0, 5);

  const approvedLogs = logbooks.filter((entry) => entry.approvals[0]?.status === "APPROVED").length;
  const pendingLogs = logbooks.length - approvedLogs;

  const activeTenantSlug = tenantContext.type === "ENROLLED" ? tenantContext.enrollment.organizationSlug : tenantContext.type === "APPLICATION" ? tenantContext.application.organizationSlug : null;
  const showApplied = searchParams?.applied === "1";
  const showActiveEnrollmentError = searchParams?.error === "active-enrollment";

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-blue-50/40 p-5 shadow-sm">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Student Portal</h1>
        <p className="text-sm text-slate-600">Track applications, onboarding, compliance, and messages in one place.</p>
      </div>

      {showApplied && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Application submitted successfully. You can track progress below.</div>}
      {showActiveEnrollmentError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">You already have an active enrollment with another organization. Complete or close your current enrollment before applying elsewhere.</div>
      )}

      {tenantContext.type === "ENROLLED" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          You are currently enrolled under: <span className="font-semibold">{tenantContext.enrollment.organizationName}</span> · {tenantContext.enrollment.programName}
        </div>
      )}

      {tenantContext.type !== "ENROLLED" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Applications</p><p className="mt-1 text-2xl font-semibold text-slate-900">{applications.length}</p></div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-xs uppercase text-indigo-700">In pipeline</p><p className="mt-1 text-2xl font-semibold text-indigo-800">{submitted + shortlisted}</p></div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs uppercase text-emerald-700">Accepted</p><p className="mt-1 text-2xl font-semibold text-emerald-800">{accepted}</p></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs uppercase text-amber-700">Employability score</p><p className="mt-1 text-2xl font-semibold text-amber-800">{employabilityScore}%</p></div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">My applications</p>
              <div className="mt-2 space-y-2">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-900">{app.opportunity.title}</p>
                    <p className="text-xs text-slate-600">{app.opportunity.organization.name} · {app.status}</p>
                  </div>
                ))}
                {applications.length === 0 && <p className="text-xs text-slate-500">No applications yet. Start from marketplace below.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">What happens after applying?</p>
              <ol className="mt-2 space-y-2 text-sm text-slate-700">
                <li>1. Your application enters tenant screening.</li>
                <li>2. If accepted, tenant creates your enrollment.</li>
                <li>3. Your portal switches to program mode (checklist, logbooks, payslips).</li>
              </ol>
              <Link href="/opportunities" className="mt-3 inline-flex rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">Open marketplace</Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Marketplace recommendations</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {opportunities.slice(0, 6).map((opp) => (
                <div key={opp.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-900">{opp.title}</p>
                  <p className="text-xs text-slate-600">{opp.organization.name} · {opp.type}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">My journey</p><p className="mt-1 text-lg font-semibold text-slate-900">{tenantContext.enrollment.programName}</p></div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-xs uppercase text-indigo-700">Onboarding</p><p className="mt-1 text-2xl font-semibold text-indigo-800">{checklistProgress}%</p></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs uppercase text-amber-700">Compliance warnings</p><p className="mt-1 text-2xl font-semibold text-amber-800">{expiringSoon + expired}</p></div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs uppercase text-blue-700">Logbooks</p><p className="mt-1 text-2xl font-semibold text-blue-800">{approvedLogs}/{logbooks.length}</p></div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Next actions checklist</p>
              <div className="mt-2 space-y-2">
                {nextActions.map((item) => (
                  <form key={item.id} action={`/api/checklist/items/${item.id}/complete`} method="post" className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span>{item.label} · {item.status}</span>
                    <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Complete</button>
                  </form>
                ))}
                {nextActions.length === 0 && <p className="text-xs text-slate-500">No pending checklist actions.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Recent messages with tenant</p>
              <div className="mt-2 space-y-2 text-sm">
                {threads.flatMap((thread) => thread.messages).slice(0, 5).map((message) => (
                  <div key={message.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{message.body}</div>
                ))}
                {threads.length === 0 && <p className="text-xs text-slate-500">No messages yet.</p>}
              </div>
              <Link href="/app/whatsapp-sim" className="mt-3 inline-flex rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">Open messages</Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Logbook summary</p>
            <p className="mt-1 text-xs text-slate-600">Weeks done: {approvedLogs} · Pending approvals: {pendingLogs}</p>
            {activeTenantSlug && (
              <Link href={`/org/${activeTenantSlug}/student`} className="mt-2 inline-flex rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700">Open tenant student workspace</Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
