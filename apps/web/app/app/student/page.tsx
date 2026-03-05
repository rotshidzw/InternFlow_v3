import Link from "next/link";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  MessageSquare,
  User,
  UserCircle2,
} from "lucide-react";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function initials(name: string | null, email: string) {
  if (!name) return email.slice(0, 2).toUpperCase();
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type StudentPortalProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function StudentPortalPage({
  searchParams,
}: StudentPortalProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const context = await resolveStudentTenantContext(user.id);

  const studentProfileDelegate = (
    prisma as unknown as {
      studentProfile?: {
        findUnique: (args: { where: { userId: string } }) => Promise<{
          skills: string[];
          education: unknown;
        } | null>;
      };
    }
  ).studentProfile;

  const [
    profile,
    studentProfile,
    docs,
    applications,
    opportunities,
    logbooks,
    threads,
    payslips,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    studentProfileDelegate?.findUnique({ where: { userId: user.id } }) ?? null,
    prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.application.findMany({
      where: { userId: user.id },
      include: {
        opportunity: { include: { organization: true } },
        checklist: { include: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.opportunity.findMany({
      where: { status: "PUBLISHED" },
      include: { organization: true },
      orderBy: { id: "desc" },
      take: 8,
    }),
    prisma.logbookEntry.findMany({
      where: { userId: user.id },
      include: { approvals: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.chatThread.findMany({
      where: { userId: user.id },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 3 } },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.document.count({ where: { userId: user.id, type: "PAYSLIP" } }),
  ]);

  const hasCv = docs.some((doc) => doc.type === "CV");

  const profileSignals = [
    Boolean(user.name),
    Boolean(profile?.phone),
    Boolean(profile?.education || studentProfile?.education),
    Boolean(profile?.emergencyContact),
    hasCv,
  ];
  const employabilityScore = Math.round(
    (profileSignals.filter(Boolean).length / profileSignals.length) * 100,
  );

  const now = new Date();
  const expiringSoon = docs.filter(
    (d) =>
      d.expirationDate &&
      d.expirationDate > now &&
      d.expirationDate.getTime() - now.getTime() <= 90 * 24 * 60 * 60 * 1000,
  ).length;
  const expired = docs.filter(
    (d) => d.expirationDate && d.expirationDate < now,
  ).length;

  const submitted = applications.filter((a) =>
    ["APPLIED", "SUBMITTED", "DRAFT", "REVIEW"].includes(a.status),
  ).length;
  const shortlisted = applications.filter(
    (a) => a.status === "SHORTLISTED",
  ).length;
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;

  const latestChecklist = applications.find((app) => app.checklist)?.checklist;
  const checklistItems = latestChecklist?.items ?? [];
  const checklistDone = checklistItems.filter(
    (item) => item.status === "DONE",
  ).length;
  const checklistProgress =
    latestChecklist?.progress ?? pct(checklistDone, checklistItems.length);
  const nextActions = checklistItems
    .filter((item) => item.status !== "DONE")
    .slice(0, 4);
  const dueSoonItems = checklistItems.filter(
    (item) =>
      item.dueDate &&
      item.status !== "DONE" &&
      item.dueDate.getTime() - now.getTime() <= 5 * 24 * 60 * 60 * 1000,
  ).length;

  const approvedLogs = logbooks.filter(
    (entry) => entry.approvals[0]?.status === "APPROVED",
  ).length;

  const programWorkspaceUrl =
    context.type === "ENROLLED"
      ? `/org/${context.enrollment.organizationSlug}/student`
      : context.type === "APPLICATION"
        ? `/org/${context.application.organizationSlug}/student`
        : null;

  const recentMessages = threads
    .flatMap((thread) => thread.messages)
    .slice(0, 3);

  const showApplied = searchParams?.applied === "1";
  const showActiveEnrollmentError = searchParams?.error === "active-enrollment";
  const showAlreadyApplied = searchParams?.notice === "already-applied";
  const showProfileUpdated = searchParams?.notice === "profile-updated";
  const showCvUploaded = searchParams?.notice === "cv-uploaded";
  const showMissingFile = searchParams?.error === "missing-file";

  const profileChecklist = [
    { label: "Upload CV", done: hasCv },
    {
      label: "Add education history",
      done: Boolean(profile?.education || studentProfile?.education),
    },
    { label: "Add skills", done: Boolean(studentProfile?.skills.length) },
    { label: "Verify contact details", done: Boolean(profile?.phone) },
  ];

  const topNotifications = [
    recentMessages[0]
      ? "New message from Program Manager"
      : "No new messages yet",
    dueSoonItems > 0
      ? `Application deadline items due in ${Math.min(5, dueSoonItems)} day(s)`
      : "No urgent checklist deadlines",
  ];

  return (
    <div className="min-h-[calc(100vh-7rem)] space-y-6 rounded-3xl border border-slate-200/80 bg-slate-50 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] md:p-6">
      <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-700">
              Student Portal Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900 md:text-3xl">
              Welcome back, {user.name ?? "Student"} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Here’s an overview of your applications and progress.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Progress summary: profile {checklistProgress}% complete ·
              employability score {employabilityScore}%
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
              {initials(user.name, user.email)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {user.name ?? "Student"}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      {(showApplied || showAlreadyApplied || showActiveEnrollmentError) && (
        <div className="grid gap-2">
          {showApplied && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Application submitted. Track progress below.
            </div>
          )}
          {showAlreadyApplied && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              You already applied for this opportunity.
            </div>
          )}
          {showActiveEnrollmentError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You already have an active enrollment in another organization.
            </div>
          )}
          {showProfileUpdated && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Profile updated successfully.
            </div>
          )}
          {showCvUploaded && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              CV uploaded successfully.
            </div>
          )}
          {showMissingFile && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              Please choose a CV file before uploading.
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Profile Completion – {checklistProgress}%
            </h2>
            <UserCircle2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
              style={{ width: `${Math.min(100, checklistProgress)}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {profileChecklist.map((item) => (
              <p
                key={item.label}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${item.done ? "bg-emerald-500" : "bg-amber-400"}`}
                />
                {item.label}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-semibold text-slate-900">
            Your Next Steps
          </h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>✔ Complete profile</p>
            <p>
              {applications.length > 0 ? "✔" : "⬜"} Apply for first opportunity
            </p>
            <p>{docs.length > 0 ? "✔" : "⬜"} Upload documents</p>
          </div>
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Primary action
            </p>
            <p className="mt-1 text-sm text-indigo-900">
              Find opportunities that match your profile and interests.
            </p>
            <Link
              href="/opportunities"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Explore Marketplace <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/onboarding/profile"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit Full Profile
            </Link>
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="text-lg font-semibold text-slate-900">
          Profile Actions (Quick Update)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Update profile fields and upload CV here. If these are completed, you
          can apply without uploading them again.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <form
            action="/api/student/profile-quick"
            method="post"
            className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-sm font-semibold text-slate-800">
              Edit profile details
            </p>
            <input
              name="phone"
              defaultValue={profile?.phone ?? ""}
              placeholder="Verify contact details (phone)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              name="education"
              defaultValue={profile?.education ?? ""}
              placeholder="Add education history"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              name="skills"
              defaultValue={studentProfile?.skills.join(", ") ?? ""}
              placeholder="Add skills (comma separated)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              name="emergencyContact"
              defaultValue={profile?.emergencyContact ?? ""}
              placeholder="Emergency contact"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
              Save profile updates
            </button>
          </form>

          <form
            action="/api/student/upload-required"
            method="post"
            encType="multipart/form-data"
            className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-sm font-semibold text-slate-800">Upload CV</p>
            <input
              name="file"
              type="file"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400">
              Upload CV
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border-l-4 border-sky-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Briefcase className="h-4 w-4 text-sky-600" />
            Applications
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {applications.length}
          </p>
        </div>
        <div className="rounded-2xl border-l-4 border-amber-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Clock3 className="h-4 w-4 text-amber-600" />
            In Pipeline
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {submitted + shortlisted}
          </p>
        </div>
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Accepted
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {accepted}
          </p>
        </div>
        <div className="rounded-2xl border-l-4 border-violet-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <MessageSquare className="h-4 w-4 text-violet-600" />
            Messages
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {recentMessages.length}
          </p>
        </div>
        <div className="rounded-2xl border-l-4 border-violet-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <FolderOpen className="h-4 w-4 text-violet-600" />
            Documents
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {docs.length}
          </p>
        </div>
        <div className="rounded-2xl border-l-4 border-violet-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <FileText className="h-4 w-4 text-violet-600" />
            Concerns / Payslips
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {payslips}
          </p>
        </div>
        <div className="rounded-2xl border-l-4 border-amber-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Clock3 className="h-4 w-4 text-amber-600" />
            Due Soon Actions
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {dueSoonItems}
          </p>
        </div>
        <div className="rounded-2xl border-l-4 border-sky-500 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <User className="h-4 w-4 text-sky-600" />
            Logbook Approvals
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {approvedLogs}/{logbooks.length}
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-semibold text-slate-900">
            Application Journey
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              "Apply for opportunity",
              "Application screening",
              "Acceptance",
              "Enrollment activated",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
              >
                <p className="text-xs font-semibold text-indigo-600">
                  Step {index + 1}
                </p>
                <p className="mt-1">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Bell className="h-5 w-5 text-amber-500" />
            Notifications
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            {topNotifications.map((note) => (
              <p
                key={note}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
              >
                {note}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Recommended Marketplace Opportunities
          </h2>
          <Link
            href="/opportunities"
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {opportunities.slice(0, 6).map((opp) => (
            <article
              key={opp.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-900">{opp.title}</h3>
              <p className="mt-1 text-xs text-slate-600">
                {opp.type === "INTERNSHIP" ? "Internship" : "Skills Program"} ·{" "}
                {opp.organization.name}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {opp.description.slice(0, 110)}
                {opp.description.length > 110 ? "…" : ""}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Location: {opp.organization.name}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/opportunities/${opp.organization.slug}/${opp.slug}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Details
                </Link>
                <Link
                  href={`/opportunities/${opp.organization.slug}/${opp.slug}`}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Apply
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-semibold text-slate-900">
            Checklist Actions
          </h2>
          <div className="mt-3 space-y-2">
            {nextActions.map((item) => (
              <form
                key={item.id}
                action={`/api/checklist/items/${item.id}/complete`}
                method="post"
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="text-slate-700">
                  {item.label} · {item.status}
                </span>
                <button className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Complete
                </button>
              </form>
            ))}
            {nextActions.length === 0 && (
              <p className="text-sm text-slate-500">
                No pending checklist actions.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-semibold text-slate-900">Quick Access</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href="/app/whatsapp-sim"
              className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-violet-700"
            >
              Messages
            </Link>
            <Link
              href="/app/whatsapp-sim"
              className="rounded-lg border border-fuchsia-300 bg-fuchsia-50 px-3 py-2 text-fuchsia-700"
            >
              Concerns
            </Link>
            {programWorkspaceUrl && (
              <Link
                href={programWorkspaceUrl}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-indigo-700"
              >
                Program Workspace
              </Link>
            )}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Compliance alerts: {expiringSoon + expired} · Active applications:{" "}
            {applications.length}
          </p>
        </section>
      </div>
    </div>
  );
}
