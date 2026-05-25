"use client";

import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

type NavItem = {
  href: string;
  label: string;
  roles: string[];
  group: "Core" | "Operations";
};

const nav: NavItem[] = [
  {
    href: "/hq/dashboard",
    label: "Dashboard",
    roles: ["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_SUPPORT", "PLATFORM_OPS", "PLATFORM_FINANCE"],
    group: "Core",
  },
  {
    href: "/hq/tenants",
    label: "Tenants",
    roles: ["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_SUPPORT", "PLATFORM_OPS"],
    group: "Core",
  },
  {
    href: "/hq/users",
    label: "HQ Users",
    roles: ["PLATFORM_ADMIN"],
    group: "Core",
  },
  {
    href: "/hq/settings",
    label: "Settings",
    roles: ["PLATFORM_ADMIN", "PLATFORM_OPS"],
    group: "Core",
  },
  {
    href: "/hq/approvals",
    label: "Approvals",
    roles: ["PLATFORM_ADMIN", "PLATFORM_SALES"],
    group: "Operations",
  },
  {
    href: "/hq/meetings",
    label: "Meetings",
    roles: ["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_OPS"],
    group: "Operations",
  },
  {
    href: "/hq/support",
    label: "Support",
    roles: ["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_OPS"],
    group: "Operations",
  },
  {
    href: "/hq/observability",
    label: "Observability",
    roles: ["PLATFORM_ADMIN", "PLATFORM_OPS", "PLATFORM_SUPPORT"],
    group: "Operations",
  },
];

export function HQShell({
  children,
  role,
  userEmail,
}: PropsWithChildren<{ role: string; userEmail: string }>) {
  const visible = nav.filter((item) => item.roles.includes(role));
  const core = visible.filter((item) => item.group === "Core");
  const ops = visible.filter((item) => item.group === "Operations");

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="grid min-h-screen md:grid-cols-[290px_1fr]">
        <aside className="border-r border-brand-border/80 bg-[#080a18]/86 p-5 shadow-2xl backdrop-blur-2xl">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.15em] text-brand-muted">InternFlow Head</p>
            <p className="text-lg font-semibold text-brand-text">Platform Core Console</p>
            <p className="mt-1 text-xs text-brand-muted">
              Global governance, tenant operations, and systems oversight.
            </p>
          </div>

          <p className="mb-2 text-xs uppercase tracking-[0.15em] text-brand-muted">Core</p>
          <nav className="space-y-1.5">
            {core.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-xl border border-transparent px-3 py-2 text-sm text-brand-muted transition hover:border-brand-border hover:bg-brand-surface hover:text-brand-text"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <p className="mb-2 mt-5 text-xs uppercase tracking-[0.15em] text-brand-muted">Operations</p>
          <nav className="space-y-1.5">
            {ops.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-xl border border-transparent px-3 py-2 text-sm text-brand-muted transition hover:border-brand-border hover:bg-brand-surface hover:text-brand-text"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div>
          <header className="sticky top-0 z-10 border-b border-brand-border/75 bg-[#080a18]/76 px-6 py-3 shadow-lg backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-brand-muted">
                Head role: <span className="font-semibold text-brand-text">{role}</span>
              </p>
              <div className="flex items-center gap-3 text-sm">
                <p className="text-brand-muted">{userEmail}</p>
                <form action="/api/auth/logout" method="post">
                  <button className="if-btn if-btn-secondary px-3 py-1.5 text-xs">Log out</button>
                </form>
              </div>
            </div>
          </header>
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
