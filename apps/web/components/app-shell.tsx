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
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <header className="sticky top-0 z-20 border-b border-brand-border/70 bg-[#090a1a]/84 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="InternFlow" className="h-8 w-8 rounded-lg ring-1 ring-brand-accent/40" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">
                InternFlow learner portal
              </p>
              <p className="text-sm font-semibold text-brand-text">{orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-brand-muted">
            <span className="if-badge">
              <ShieldCheck className="h-3.5 w-3.5" />
              {role.replace("_", " ")}
            </span>
            <span className="if-badge">{orgSlug}</span>
            <form action="/api/auth/logout" method="post">
              <button className="if-btn if-btn-secondary px-2.5 py-1 text-xs">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="if-panel p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-brand-muted">
            Student workspace
          </p>
          <nav className="space-y-1.5 text-sm">
            {items.map((item) => (
              <a
                key={item.label}
                href={`/org/${orgSlug}/${item.href}`}
                className="group block rounded-lg border border-transparent px-3 py-2 text-brand-muted transition hover:border-brand-border hover:bg-brand-surface hover:text-brand-text"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="if-panel-muted mt-4 space-y-2 p-3 text-xs text-brand-muted">
            <p className="flex items-center gap-1.5 font-semibold text-brand-text">
              <Compass className="h-3.5 w-3.5 text-brand-accentStrong" />
              Quick actions
            </p>
            <a href="/app/student" className="flex items-center gap-1.5 hover:text-brand-text">
              <Building2 className="h-3.5 w-3.5" /> Global student portal
            </a>
            <a href="/app/whatsapp-sim" className="flex items-center gap-1.5 hover:text-brand-text">
              <MessageSquare className="h-3.5 w-3.5" /> Messages
            </a>
            <a href="/app/student/documents" className="flex items-center gap-1.5 hover:text-brand-text">
              <Building2 className="h-3.5 w-3.5" /> Upload documents
            </a>
            <p className="flex items-center gap-1.5">
              <BellRing className="h-3.5 w-3.5 text-brand-accentStrong" /> Stay on checklist deadlines
            </p>
          </div>
        </aside>

        <main className="if-panel p-5">{children}</main>
      </div>
    </div>
  );
}
