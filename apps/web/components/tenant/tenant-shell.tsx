"use client";

import { useState, type ComponentType, type PropsWithChildren } from "react";
import { motion } from "framer-motion";
import {
  BellRing,
  Briefcase,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gauge,
  GraduationCap,
  HandCoins,
  LayoutTemplate,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UserSquare2,
  ArrowLeft,
  Award,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const primaryItems: NavItem[] = [
  { href: "dashboard", label: "Dashboard", icon: Gauge },
  { href: "programs", label: "Programs", icon: GraduationCap },
  { href: "templates", label: "Templates", icon: LayoutTemplate },
  { href: "opportunities", label: "Opportunities", icon: Briefcase },
  { href: "applicants", label: "Applicants", icon: UserSquare2 },
  { href: "enrollments", label: "Enrollments", icon: ClipboardList },
  { href: "intakes", label: "Intakes", icon: ClipboardList },
  { href: "documents", label: "Documents", icon: FolderOpen },
  { href: "learners", label: "Learners", icon: Users },
  { href: "logbooks", label: "Logbooks", icon: FileText },
  { href: "approvals", label: "Approvals", icon: FileCheck2 },
];

const operationsItems: NavItem[] = [
  { href: "reports", label: "Reports", icon: FileSpreadsheet },
  { href: "reports/exports", label: "Close-out Exports", icon: ScrollText },
  { href: "learner-chat", label: "Communication", icon: MessageSquare },
  { href: "notifications", label: "Notifications", icon: BellRing },
  { href: "registers", label: "Attendance Registers", icon: FileText },
  { href: "progress", label: "Progress Tracker", icon: Gauge },
  { href: "stipends", label: "Stipends", icon: HandCoins },
  { href: "costs", label: "Cost Capture", icon: FileSpreadsheet },
  { href: "follow-ups", label: "Follow-Ups", icon: ClipboardList },
  { href: "certificates", label: "Certificates", icon: Award },
];

const adminItems: NavItem[] = [
  { href: "staff", label: "Staff", icon: Users },
  { href: "settings", label: "Settings", icon: Settings },
];

export function TenantShell({
  children,
  orgSlug,
  orgName,
  role,
}: PropsWithChildren<{ orgSlug: string; orgName: string; role: string }>) {
  const [collapsed, setCollapsed] = useState(false);

  const navClass =
    "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-brand-muted transition-all hover:border-brand-border hover:bg-brand-surface hover:text-brand-text";

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text transition-colors duration-300">
      <div className={`grid min-h-screen ${collapsed ? "md:grid-cols-[92px_1fr]" : "md:grid-cols-[292px_1fr]"}`}>
        <aside className="border-r border-brand-border/75 bg-[#080916]/84 p-4 shadow-2xl shadow-black/35 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between gap-2">
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <img
                  src="/internflow-logo.png"
                  alt="InternFlow"
                  className="h-8 w-auto drop-shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-muted">InternFlow</p>
                  <p className="text-base font-semibold text-brand-text">{orgName}</p>
                </div>
              </div>
            ) : (
              <p className="text-lg font-bold text-brand-text">IF</p>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="if-btn if-btn-secondary if-btn-nav text-xs"
            >
              {collapsed ? ">" : "<"}
            </button>
          </div>

          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-brand-muted">Tenant portal</p>
          <nav className="space-y-1.5">
            {primaryItems.map(({ href, label, icon: Icon }) => (
              <a key={href} href={`/org/${orgSlug}/app/${href}`} className={navClass} title={label}>
                <Icon className="h-4 w-4 shrink-0 text-brand-muted transition group-hover:text-brand-accentStrong" />
                {!collapsed && <span>{label}</span>}
              </a>
            ))}
          </nav>

          <div className="my-4 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent" />

          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-brand-muted">Operations</p>
          <nav className="space-y-1.5">
            {operationsItems.map(({ href, label, icon: Icon }) => (
              <a key={href} href={`/org/${orgSlug}/app/${href}`} className={navClass} title={label}>
                <Icon className="h-4 w-4 shrink-0 text-brand-muted transition group-hover:text-brand-accentStrong" />
                {!collapsed && <span>{label}</span>}
              </a>
            ))}
          </nav>

          <div className="my-4 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent" />

          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-brand-muted">Administration</p>
          <nav className="space-y-1.5">
            {adminItems.map(({ href, label, icon: Icon }) => (
              <a key={href} href={`/org/${orgSlug}/app/${href}`} className={navClass} title={label}>
                <Icon className="h-4 w-4 shrink-0 text-brand-muted transition group-hover:text-brand-accentStrong" />
                {!collapsed && <span>{label}</span>}
              </a>
            ))}
          </nav>

          {!collapsed && (
            <div className="if-panel-muted mt-5 p-3 text-xs text-brand-muted">
              <div className="mb-1 flex items-center gap-2 font-semibold text-brand-text">
                <BellRing className="h-3.5 w-3.5 text-brand-accentStrong" />
                Quick focus
              </div>
              <p className="leading-relaxed">Direct access to applicants, approvals, follow-ups, and close-out evidence.</p>
            </div>
          )}
        </aside>

        <div>
          <header className="sticky top-0 z-10 border-b border-brand-border/75 bg-[#080916]/78 px-6 py-3 shadow-lg shadow-black/35 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-brand-muted">InternFlow</p>
                <p className="flex items-center gap-2 font-semibold text-brand-text">
                  {orgName}
                  <span className="if-badge">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {role.replace("_", " ")}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={`/org/${orgSlug}/app/learners`} method="get" className="flex items-center gap-2">
                  <input
                    name="q"
                    placeholder="Search learners..."
                    className="rounded-xl border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
                  />
                  <button className="if-btn if-btn-secondary if-btn-nav text-xs">Search</button>
                </form>
                <form action="/api/auth/logout" method="post">
                  <button className="if-btn if-btn-secondary if-btn-nav text-xs">Logout</button>
                </form>
              </div>
            </div>
          </header>
          <motion.main
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                  return;
                }
                window.location.href = `/org/${orgSlug}/app/dashboard`;
              }}
              className="if-btn if-btn-secondary mb-4 px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
