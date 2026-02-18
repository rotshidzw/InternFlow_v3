import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

type StudentPortalProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function StudentPortalPage({ searchParams }: StudentPortalProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const context = await resolveStudentTenantContext(user.id);

  const [profile, docs, applications, opportunities, logbooks, threads, payslips] = await Promise.all([
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
    prisma.chatThread.findMany({ where: { userId: user.id }, include: { messages: { orderBy: { createdAt: "desc" }, take: 3 } }, orderBy: { createdAt: "desc" }, take: 2 }),
    prisma.document.count({ where: { userId: user.id, type: "PAYSLIP" } })
  ]);

  const profileSignals = [Boolean(user.name), Boolean(profile?.phone), Boolean(profile?.education), Boolean(profile?.emergencyContact), docs.length > 0];
  const employabilityScore = Math.round((profileSignals.filter(Boolean).length / profileSignals.length) * 100);

  const now = new Date();
  const expiringSoon = docs.filter((d) => d.expirationDate && d.expirationDate > now && d.expirationDate.getTime() - now.getTime() <= 90 * 24 * 60 * 60 * 1000).length;
  const expired = docs.filter((d) => d.expirationDate && d.expirationDate < now).length;

  const submitted = applications.filter((a) => ["APPLIED", "SUBMITTED", "DRAFT", "REVIEW"].includes(a.status)).length;
  const shortlisted = applications.filter((a) => a.status === "SHORTLISTED").length;
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;

  const latestChecklist = applications.find((app) => app.checklist)?.checklist;
  const checklistItems = latestChecklist?.items ?? [];
  const checklistDone = checklistItems.filter((item) => item.status === "DONE").length;
  const checklistProgress = latestChecklist?.progress ?? pct(checklistDone, checklistItems.length);
  const nextActions = checklistItems.filter((item) => item.status !== "DONE").slice(0, 4);

  const approvedLogs = logbooks.filter((entry) => entry.approvals[0]?.status === "APPROVED").length;
  const pendingLogs = logbooks.length - approvedLogs;

  const programWorkspaceUrl =
    context.type === "ENROLLED"
      ? `/org/${context.enrollment.organizationSlug}/student`
      : context.type === "APPLICATION"
      ? `/org/${context.application.organizationSlug}/student`
      : null;

  const showApplied = searchParams?.applied === "1";
  const showActiveEnrollmentError = searchParams?.error === "active-enrollment";
  const showAlreadyApplied = searchParams?.notice === "already-applied";

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eef2ff_35%,#f8fafc_80%)] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Student Portal</h1>
          <p className="text-sm text-slate-600">A smooth journey across applications, onboarding, messages, logbooks and payslips.</p>
        </div>
        {programWorkspaceUrl && (
          <Link href={programWorkspaceUrl} className="inline-flex rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 shadow-sm">
            Open program workspace
          </Link>
        )}
      </div>

      {showApplied && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Application submitted. Track progress below. Once accepted, use “Open program workspace”.</div>}
      {showAlreadyApplied && <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">You already applied for this opportunity.</div>}
      {showActiveEnrollmentError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">You already have an active enrollment in another organization. You cannot apply elsewhere until that enrollment is completed/cancelled.</div>
      )}

      {context.type === "ENROLLED" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          You are currently enrolled under: <span className="font-semibold">{context.enrollment.organizationName}</span> · {context.enrollment.programName}
        </div>
      )}

      {context.type !== "ENROLLED" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4"><p className="text-xs uppercase text-slate-500">Applications</p><p className="mt-1 text-2xl font-semibold text-slate-900">{applications.length}</p></div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-4"><p className="text-xs uppercase text-indigo-700">In pipeline</p><p className="mt-1 text-2xl font-semibold text-indigo-800">{submitted + shortlisted}</p></div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4"><p className="text-xs uppercase text-emerald-700">Accepted</p><p className="mt-1 text-2xl font-semibold text-emerald-800">{accepted}</p></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4"><p className="text-xs uppercase text-amber-700">Employability score</p><p className="mt-1 text-2xl font-semibold text-amber-800">{employabilityScore}%</p></div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">My applications</p>
              <div className="mt-2 space-y-2">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-900">{app.opportunity.title}</p>
                    <p className="text-xs text-slate-600">{app.opportunity.organization.name} · {app.status}</p>
                  </div>
                ))}
                {applications.length === 0 && <p className="text-xs text-slate-500">No applications yet. Explore marketplace opportunities below.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">After you apply (next step URL)</p>
              <ol className="mt-2 space-y-2 text-sm text-slate-700">
                <li>1. Application enters tenant screening.</li>
                <li>2. If accepted, enrollment is created under that tenant.</li>
                <li>3. Your active portal URL becomes: <span className="font-semibold">/org/{`{tenantSlug}`}/student</span>.</li>
              </ol>
              {programWorkspaceUrl && (
                <Link href={programWorkspaceUrl} className="mt-3 inline-flex rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">Go to current tenant student portal</Link>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
            <p className="text-sm font-semibold text-slate-900">Marketplace recommendations</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {opportunities.slice(0, 6).map((opp) => (
                <div key={opp.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-900">{opp.title}</p>
                  <p className="text-xs text-slate-600">{opp.organization.name} · {opp.type}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Link href="/opportunities" className="inline-flex rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">Open marketplace</Link>
              <Link href="/app/whatsapp-sim" className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Open messages & docs</Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4"><p className="text-xs uppercase text-slate-500">My journey</p><p className="mt-1 text-lg font-semibold text-slate-900">{context.enrollment.programName}</p></div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-4"><p className="text-xs uppercase text-indigo-700">Onboarding</p><p className="mt-1 text-2xl font-semibold text-indigo-800">{checklistProgress}%</p></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4"><p className="text-xs uppercase text-amber-700">Compliance alerts</p><p className="mt-1 text-2xl font-semibold text-amber-800">{expiringSoon + expired}</p></div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-4"><p className="text-xs uppercase text-blue-700">Logbooks</p><p className="mt-1 text-2xl font-semibold text-blue-800">{approvedLogs}/{logbooks.length}</p></div>
            <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-4"><p className="text-xs uppercase text-violet-700">Payslips</p><p className="mt-1 text-2xl font-semibold text-violet-800">{payslips}</p></div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
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

            <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
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

          <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
            <p className="text-sm font-semibold text-slate-900">Program mode access</p>
            <p className="mt-1 text-xs text-slate-600">Main URL: /org/{context.enrollment.organizationSlug}/student</p>
            <p className="text-xs text-slate-600">Weeks done: {approvedLogs} · Pending approvals: {pendingLogs}</p>
            <Link href={`/org/${context.enrollment.organizationSlug}/student`} className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Go to tenant student portal</Link>
          </div>
        </>
      )}
    </div>
  );
}
