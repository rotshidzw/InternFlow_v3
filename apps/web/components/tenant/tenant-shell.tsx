"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ComponentType,
  type PropsWithChildren,
} from "react";
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
  const [theme, setTheme] = useState<"soft" | "vivid">("soft");

  useEffect(() => {
    const saved = window.localStorage.getItem("if_tenant_theme");
    if (saved === "vivid") setTheme("vivid");
  }, []);

  function toggleTheme() {
    const next = theme === "soft" ? "vivid" : "soft";
    setTheme(next);
    window.localStorage.setItem("if_tenant_theme", next);
  }

  const shellBg =
    theme === "soft"
      ? "bg-[radial-gradient(circle_at_top,#dbeafe_0%,#e2e8f0_38%,#f8fafc_100%)]"
      : "bg-[radial-gradient(circle_at_top,#ccfbf1_0%,#dbeafe_35%,#ede9fe_72%,#f8fafc_100%)]";

  const navClass =
    "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-200 hover:bg-white/80 hover:text-slate-900";

  return (
    <div
      className={`min-h-screen ${shellBg} text-slate-900 transition-colors duration-300`}
    >
      <div
        className={`grid min-h-screen ${collapsed ? "md:grid-cols-[92px_1fr]" : "md:grid-cols-[292px_1fr]"}`}
      >
        <aside className="border-r border-white/70 bg-white/72 p-4 shadow-xl shadow-slate-200/35 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between gap-2">
            {!collapsed ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  InternFlow
                </p>
                <p className="text-base font-semibold">{orgName}</p>
              </div>
            ) : (
              <p className="text-lg font-bold">IF</p>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-xl border border-slate-300/80 bg-white px-2.5 py-1 text-xs shadow-sm transition hover:bg-slate-50"
            >
              {collapsed ? ">" : "<"}
            </button>
          </div>

          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            Tenant portal
          </p>
          <nav className="space-y-1.5">
            {primaryItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={`/org/${orgSlug}/app/${href}`}
                className={navClass}
                title={label}
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-blue-600" />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>

          <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            Operations
          </p>
          <nav className="space-y-1.5">
            {operationsItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={`/org/${orgSlug}/app/${href}`}
                className={navClass}
                title={label}
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-indigo-600" />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>

          <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            Administration
          </p>
          <nav className="space-y-1.5">
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={`/org/${orgSlug}/app/${href}`}
                className={navClass}
                title={label}
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-indigo-600" />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>

          {!collapsed && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
                <BellRing className="h-3.5 w-3.5 text-blue-600" />
                Quick focus
              </div>
              <p className="leading-relaxed">
                One click from navigation to applicants, approvals, and reports.
              </p>
            </div>
          )}
        </aside>

        <div>
          <header className="sticky top-0 z-10 border-b border-white/70 bg-white/72 px-6 py-3 shadow-md shadow-slate-200/40 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  InternFlow
                </p>
                <p className="flex items-center gap-2 font-semibold">
                  {orgName}
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    {role.replace("_", " ")}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search learners, opportunities..."
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-sm transition hover:bg-slate-50"
                >
                  Theme: {theme === "soft" ? "Soft" : "Vivid"}
                </button>
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-sm transition hover:bg-slate-50">
                    Logout
                  </button>
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
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-100"
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
