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
  Settings,
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

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true },
  });
  const hasStudentMembership = memberships.some((m) => m.role === "STUDENT");
  const nonStudentMembership = memberships.find((m) => m.role !== "STUDENT");
  if (!hasStudentMembership && nonStudentMembership) {
    redirect(`/org/${nonStudentMembership.organization.slug}/app/dashboard`);
  }

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

  const isEnrolled = context.type === "ENROLLED";

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
  const showInviteJoined = searchParams?.notice === "invite-joined";
  const showInviteTokenInvalid = searchParams?.error === "invalid-invite-token";
  const showInviteNotFound = searchParams?.error === "invite-not-found";
  const showInviteExpired = searchParams?.error === "invite-expired";
  const showInviteMaxed = searchParams?.error === "invite-maxed";
  const showInviteRoleUnsupported =
    searchParams?.error === "invite-role-unsupported";
  const showStaffMembershipConflict =
    searchParams?.error === "staff-membership-conflict";

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
    <div className="min-h-[calc(100vh-7rem)] space-y-6 rounded-3xl border border-indigo-100 bg-gradient-to-b from-slate-50 via-indigo-50/40 to-sky-50/40 p-4 shadow-[0_20px_55px_rgba(15,23,42,0.10)] md:p-6">
      <section className="rounded-2xl border border-indigo-100 bg-white/95 p-5 shadow-[0_10px_24px_rgba(30,41,59,0.10)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-700">
              Student Command Center
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900 md:text-3xl">
              Welcome back, {user.name ?? "Student"} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your program journey, profile readiness, and active
              discussions in one place.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Progress summary: profile {checklistProgress}% complete ·
              employability score {employabilityScore}%
            </p>
          </div>
          <div className="w-full space-y-3 md:w-[370px]">
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
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Student Profile
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    View your saved profile details and continue setup in guided
                    sections.
                  </p>
                </div>
                <Link
                  href="/onboarding/profile"
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Edit profile
                </Link>
              </div>

              <dl className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="font-medium text-slate-700">Phone</dt>
                  <dd>{profile?.phone || "Not set"}</dd>
                </div>
                <div className="flex justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="font-medium text-slate-700">Education</dt>
                  <dd className="max-w-[180px] truncate text-right">
                    {(profile?.education as string) || "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="font-medium text-slate-700">Skills</dt>
                  <dd className="max-w-[180px] truncate text-right">
                    {studentProfile?.skills.join(", ") || "Not set"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-slate-500">
                CV upload and detailed profile updates are now done inside the
                profile setup flow.
              </p>
            </section>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <details className="group rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-800">
              <span>☰ Menu</span>
              <span className="text-xs text-slate-500 group-open:hidden">
                Open
              </span>
              <span className="hidden text-xs text-slate-500 group-open:inline">
                Close
              </span>
            </summary>
            <nav className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Overview", href: "#overview", icon: Briefcase },
                {
                  label: "Profile",
                  href: "/onboarding/profile",
                  icon: UserCircle2,
                },
                {
                  label: "Program workspace",
                  href: programWorkspaceUrl ?? "/app/student",
                  icon: FolderOpen,
                },
                {
                  label: "Applications",
                  href: "#applications",
                  icon: CheckCircle2,
                },
                { label: "Documents", href: "#documents", icon: FileText },
                {
                  label: "Messages",
                  href: "/app/whatsapp-sim",
                  icon: MessageSquare,
                },
                {
                  label: "Settings",
                  href: "/onboarding/profile",
                  icon: Settings,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </details>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Profile setup sessions
            </p>
            <ol className="mt-2 space-y-1 text-sm text-slate-700">
              <li>1. Personal details</li>
              <li>2. Education details</li>
              <li>3. Skills and experience</li>
              <li>4. Documents (CV upload + AI CV autofill)</li>
            </ol>
            <Link
              href="/onboarding/profile"
              className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Continue profile setup
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-300 bg-gradient-to-br from-indigo-50 to-sky-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">
            Join a program with invite token
          </p>
          <p className="mt-1 text-xs text-indigo-700">
            Already logged in? Paste your invite token and join immediately.
          </p>
          <form
            action="/api/auth/join"
            method="post"
            className="mt-3 space-y-2"
          >
            <input
              name="token"
              placeholder="Paste invite token"
              required
              className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm text-slate-800"
            />
            <button className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Join program
            </button>
          </form>
        </div>
      </section>

      {(showApplied ||
        showAlreadyApplied ||
        showActiveEnrollmentError ||
        showInviteJoined ||
        showInviteTokenInvalid ||
        showInviteNotFound ||
        showInviteExpired ||
        showInviteMaxed ||
        showInviteRoleUnsupported ||
        showStaffMembershipConflict) && (
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
          {showInviteJoined && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Invite accepted. Open Program Workspace from the student menu.
            </div>
          )}
          {showInviteTokenInvalid && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              Please paste a valid invite token.
            </div>
          )}
          {showInviteNotFound && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              Invite token not found. Check the code and try again.
            </div>
          )}
          {showInviteExpired && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This invite token has expired. Request a new invite from the
              program team.
            </div>
          )}
          {showInviteMaxed && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Invite token has reached max usage. Request another token.
            </div>
          )}
          {showInviteRoleUnsupported && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              This invite token is not configured for learner access.
            </div>
          )}
          {showStaffMembershipConflict && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              This account is linked to staff access in this workspace. Use
              staff login flow.
            </div>
          )}
        </div>
      )}

      <div id="overview" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
              {isEnrolled ? "✔" : applications.length > 0 ? "✔" : "⬜"}{" "}
              {isEnrolled
                ? "In active programme"
                : "Apply for first opportunity"}
            </p>
            <p>{docs.length > 0 ? "✔" : "⬜"} Upload documents</p>
          </div>
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Primary action
            </p>
            <p className="mt-1 text-sm text-indigo-900">
              {isEnrolled
                ? "Open your programme workspace to track learning progress, documents, and support."
                : "Find opportunities that match your profile and interests."}
            </p>
            <Link
              href={
                isEnrolled
                  ? (programWorkspaceUrl ?? "/app/student")
                  : "/opportunities"
              }
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              {isEnrolled ? "Open Programme" : "Explore Marketplace"}{" "}
              <ChevronRight className="h-4 w-4" />
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

      <section
        id="applications"
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
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
                className="rounded-xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50 p-3 text-sm text-slate-700"
              >
                <p className="text-xs font-semibold text-indigo-600">
                  Step {index + 1}
                </p>
                <p className="mt-1">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MessageSquare className="h-5 w-5 text-violet-500" />
              Recent Discussions
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              {threads.length === 0 && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                  No discussions yet. Start one from Messages.
                </p>
              )}
              {threads.map((thread) => {
                const lastMessage = thread.messages[0];
                return (
                  <div
                    key={thread.id}
                    className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                      {thread.title || "Student support thread"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {lastMessage?.body?.slice(0, 90) || "No messages yet"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Bell className="h-5 w-5 text-amber-500" />
              Notifications
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              {topNotifications.map((note) => (
                <p
                  key={note}
                  className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-slate-700"
                >
                  {note}
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>

      {!isEnrolled && (
        <section
          id="documents"
          className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
        >
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
                  {opp.type === "INTERNSHIP" ? "Internship" : "Skills Program"}{" "}
                  · {opp.organization.name}
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
      )}

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
