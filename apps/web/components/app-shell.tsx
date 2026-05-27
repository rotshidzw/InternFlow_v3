"use client";

import { type ComponentType, type PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BellRing,
  Building2,
  Compass,
  GraduationCap,
  LayoutGrid,
  LifeBuoy,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  UserCircle2,
  Users,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const roleNav: Record<string, NavItem[]> = {
  STUDENT: [
    { href: "student", label: "Dashboard", icon: LayoutGrid },
    { href: "student/profile", label: "Profile", icon: UserCircle2 },
    { href: "student/profile/edit", label: "Edit profile", icon: UserCircle2 },
    { href: "student#overview", label: "Overview", icon: Compass },
    { href: "student#applications", label: "Applications", icon: GraduationCap },
  ],
  COORDINATOR: [
    { href: "coordinator", label: "Cohorts", icon: Users },
    { href: "app/dashboard", label: "Operations", icon: LayoutGrid },
    { href: "app/approvals", label: "Approvals", icon: ShieldAlert },
  ],
  PROVIDER_ADMIN: [
    { href: "provider-admin", label: "Org profile", icon: Building2 },
    { href: "app/opportunities", label: "Opportunities", icon: GraduationCap },
    { href: "app/staff", label: "People", icon: Users },
  ],
  SUPERVISOR: [
    { href: "supervisor", label: "Learners", icon: Users },
    { href: "app/logbooks", label: "Logbooks", icon: BadgeCheck },
    { href: "app/approvals", label: "Approvals", icon: ShieldCheck },
  ],
};

export function AppShell({
  children,
  orgSlug,
  role,
  orgName,
}: PropsWithChildren<{ orgSlug: string; role: string; orgName: string }>) {
  const pathname = usePathname() ?? "";
  const items = roleNav[role] ?? [];
  const navItemClass = (href: string) => {
    const sectionPath = href.split("#")[0];
    const basePath = `/org/${orgSlug}/${sectionPath}`;
    const isActive =
      pathname === basePath || (sectionPath.length > 0 && pathname.startsWith(`${basePath}/`));

    return `group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${
      isActive
        ? "border-brand-accent/45 bg-brand-surface text-brand-text shadow-[0_0_0_1px_rgba(168,85,247,0.2)]"
        : "border-transparent text-brand-muted hover:border-brand-border hover:bg-brand-surface hover:text-brand-text"
    }`;
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <header className="sticky top-0 z-20 border-b border-brand-border/70 bg-[#090a1a]/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/internflow-logo.png"
              alt="InternFlow"
              className="h-8 w-auto drop-shadow-[0_0_12px_rgba(168,85,247,0.2)]"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">InternFlow workspace</p>
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
              <button className="if-btn if-btn-secondary if-btn-nav text-xs">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-[272px_1fr]">
        <aside className="if-panel p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-brand-muted">
            Role workspace
          </p>
          <nav className="space-y-1.5 text-sm">
            {items.map((item) => (
              <a
                key={item.label}
                href={`/org/${orgSlug}/${item.href}`}
                className={navItemClass(item.href)}
              >
                <item.icon className="h-4 w-4 shrink-0 text-brand-muted transition group-hover:text-brand-accentStrong" />
                <span>{item.label}</span>
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
            <a href="/app/tickets" className="flex items-center gap-1.5 hover:text-brand-text">
              <LifeBuoy className="h-3.5 w-3.5" /> Support tickets
            </a>
            <p className="flex items-center gap-1.5">
              <BellRing className="h-3.5 w-3.5 text-brand-accentStrong" /> Stay on checklist deadlines
            </p>
          </div>
        </aside>

        <main className="if-panel p-5 md:p-6">{children}</main>
      </div>
    </div>
  );
}
