import Link from "next/link";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  UserCircle2,
} from "lucide-react";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

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
          fullName: string;
          phone: string | null;
          skills: string[];
          education: unknown;
        } | null>;
      };
    }
  ).studentProfile;

  const [
    profile,
    studentProfile,
    docsCount,
    applications,
    notifications,
    threadCount,
    recentThreads,
    payslips,
    checklist,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    studentProfileDelegate?.findUnique({ where: { userId: user.id } }) ?? null,
    prisma.document.count({ where: { userId: user.id } }),
    prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.chatThread.count({ where: { userId: user.id } }),
    prisma.chatThread.findMany({
      where: { userId: user.id },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.document.count({ where: { userId: user.id, type: "PAYSLIP" } }),
    prisma.checklistInstance.findFirst({
      where: { application: { userId: user.id } },
      orderBy: { id: "desc" },
    }),
  ]);

  const isEnrolled = context.type === "ENROLLED";
  const programWorkspaceUrl =
    context.type === "ENROLLED"
      ? `/org/${context.enrollment.organizationSlug}/student`
      : context.type === "APPLICATION"
        ? `/org/${context.application.organizationSlug}/student`
        : null;

  const showApplied = searchParams?.applied === "1";
  const showAlreadyApplied = searchParams?.notice === "already-applied";
  const showActiveEnrollmentError = searchParams?.error === "active-enrollment";

  const submitted = applications.filter((a) =>
    ["APPLIED", "SUBMITTED", "DRAFT", "REVIEW"].includes(a.status),
  ).length;
  const shortlisted = applications.filter(
    (a) => a.status === "SHORTLISTED",
  ).length;
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;

  const profileChecks = [
    Boolean(studentProfile?.fullName || user.name),
    Boolean(profile?.phone || studentProfile?.phone),
    Boolean(profile?.education || studentProfile?.education),
    Boolean(studentProfile?.skills.length),
  ];
  const profileCompletion = Math.round(
    (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
  );

  return (
    <div className="min-h-[calc(100vh-7rem)] space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] md:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Student Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Welcome, {user.name ?? "Student"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {isEnrolled
                ? `You are currently in ${context.enrollment.programName}.`
                : "Complete your profile and track your student operations from one place."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app/student/profile"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserCircle2 className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href="/app/student/profile/edit"
              className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Edit profile
            </Link>
            <Link
              href={programWorkspaceUrl ?? "/app/student"}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Program page
            </Link>
            <Link
              href="/app/whatsapp-sim"
              className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              Messages
            </Link>
          </div>
        </div>

        {!hasStudentMembership && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-900">
              Join with invite token
            </p>
            <form
              action="/api/auth/join"
              method="post"
              className="mt-2 flex flex-wrap gap-2"
            >
              <input
                name="token"
                required
                placeholder="Paste invite token"
                className="min-w-[260px] flex-1 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Join programme
              </button>
            </form>
          </div>
        )}
      </section>

      {(showApplied || showAlreadyApplied || showActiveEnrollmentError) && (
        <div className="grid gap-2">
          {showApplied && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Application submitted successfully.
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
        </div>
      )}

      <section
        id="overview"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Briefcase className="h-4 w-4 text-sky-600" />
            Applications
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {applications.length}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Clock3 className="h-4 w-4 text-amber-600" />
            Pipeline
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {submitted + shortlisted}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Accepted
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {accepted}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <MessageSquare className="h-4 w-4 text-violet-600" />
            Discussions
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {threadCount}
          </p>
        </article>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Profile & compliance
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Keep your profile and required documents complete.
          </p>
          <div className="mt-4 grid gap-2 text-sm text-slate-700">
            <p>Profile completion: {profileCompletion}%</p>
            <p>Documents uploaded: {docsCount}</p>
            <p>Payslips available: {payslips}</p>
            <p>Checklist progress: {checklist?.progress ?? 0}%</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/student/profile"
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              View profile
            </Link>
            <Link
              href="/app/student/profile/edit"
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Complete sections
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Bell className="h-5 w-5 text-amber-500" />
            Notifications
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            {notifications.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                No notifications yet.
              </p>
            )}
            {notifications.map((n) => (
              <p
                key={n.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
              >
                {n.title}: {n.body}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent discussions
          </h2>
          <Link
            href="/app/whatsapp-sim"
            className="text-xs font-semibold text-violet-700 hover:text-violet-800"
          >
            Open messages
          </Link>
        </div>
        <div className="mt-3 grid gap-2">
          {recentThreads.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No discussion history yet.
            </p>
          )}
          {recentThreads.map((thread) => (
            <div
              key={thread.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {thread.title}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {thread.messages[0]?.body ?? "No messages in this thread yet."}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
