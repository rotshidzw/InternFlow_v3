"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

type NavItem = { href: string; label: string; roles: string[]; group: "Core" | "Operations" };

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f0f9ff_0%,#f8fafc_46%,#eef2ff_100%)] text-slate-900">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">InternFlow Head</p>
            <p className="text-lg font-semibold">Platform Core Console</p>
            <p className="mt-1 text-xs text-slate-500">Global governance, tenant operations, integrations.</p>
          </div>

          <p className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-500">Core</p>
          <nav className="space-y-1.5">
            {core.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl border border-transparent px-3 py-2 text-sm transition hover:border-slate-200 hover:bg-slate-100/90 hover:shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="mb-2 mt-5 text-xs uppercase tracking-[0.15em] text-slate-500">Operations</p>
          <nav className="space-y-1.5">
            {ops.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl border border-transparent px-3 py-2 text-sm transition hover:border-slate-200 hover:bg-slate-100/90 hover:shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div>
          <header className="sticky top-0 z-10 border-b border-white/70 bg-white/75 px-6 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Head role: <span className="font-semibold text-slate-900">{role}</span>
              </p>
              <div className="flex items-center gap-3 text-sm">
                <p className="text-slate-600">{userEmail}</p>
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Log out
                  </button>
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
