import Link from "next/link";
import { PropsWithChildren } from "react";
import {
  BellRing,
  Building2,
  Compass,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

type NavItem = { href: string; label: string };

const roleNav: Record<string, NavItem[]> = {
  STUDENT: [
    { href: "student", label: "Dashboard" },
    { href: "student/profile", label: "Profile" },
    { href: "student/profile/edit", label: "Edit profile" },
    { href: "student#overview", label: "Overview" },
    { href: "student#applications", label: "Applications" },
  ],
  COORDINATOR: [
    { href: "coordinator", label: "Cohorts" },
    { href: "coordinator", label: "Compliance" },
    { href: "coordinator", label: "Approvals" },
  ],
  PROVIDER_ADMIN: [
    { href: "provider-admin", label: "Org profile" },
    { href: "provider-admin", label: "Opportunities" },
    { href: "provider-admin", label: "People" },
  ],
  SUPERVISOR: [
    { href: "supervisor", label: "Learners" },
    { href: "supervisor", label: "Logbooks" },
  ],
};

export function AppShell({
  children,
  orgSlug,
  role,
  orgName,
}: PropsWithChildren<{ orgSlug: string; role: string; orgName: string }>) {
  const items = roleNav[role] ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_38%,#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="InternFlow"
              className="h-8 w-8 rounded-lg"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                InternFlow learner portal
              </p>
              <p className="text-sm font-semibold">{orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {role.replace("_", " ")}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              {orgSlug}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-slate-500">
            Student workspace
          </p>
          <nav className="space-y-1.5 text-sm">
            {items.map((item) => (
              <Link
                key={item.label}
                href={`/org/${orgSlug}/${item.href}`}
                className="block rounded-lg border border-transparent px-3 py-2 text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 space-y-2 rounded-xl border border-sky-100 bg-sky-50/80 p-3 text-xs text-slate-700">
            <p className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Compass className="h-3.5 w-3.5 text-sky-600" />
              Quick actions
            </p>
            <Link
              href="/app/student"
              className="flex items-center gap-1.5 hover:text-sky-700"
            >
              <Building2 className="h-3.5 w-3.5" /> Global student portal
            </Link>
            <Link
              href="/app/whatsapp-sim"
              className="flex items-center gap-1.5 hover:text-sky-700"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Messages
            </Link>
            <p className="flex items-center gap-1.5 text-slate-600">
              <BellRing className="h-3.5 w-3.5" /> Stay on checklist deadlines
            </p>
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
