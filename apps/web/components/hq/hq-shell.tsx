"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

type NavItem = { href: string; label: string; roles: string[] };

const nav: NavItem[] = [
  { href: "/hq/dashboard", label: "Dashboard", roles: ["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_SUPPORT", "PLATFORM_OPS", "PLATFORM_FINANCE"] },
  { href: "/hq/tenants", label: "Tenants", roles: ["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_SUPPORT", "PLATFORM_OPS"] },
  { href: "/hq/approvals", label: "Approvals", roles: ["PLATFORM_ADMIN", "PLATFORM_SALES"] },
  { href: "/hq/meetings", label: "Meetings", roles: ["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_OPS"] },
  { href: "/hq/support", label: "Support", roles: ["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_OPS"] },
  { href: "/hq/observability", label: "Observability", roles: ["PLATFORM_ADMIN", "PLATFORM_OPS", "PLATFORM_SUPPORT"] },
  { href: "/hq/users", label: "HQ Users", roles: ["PLATFORM_ADMIN"] },
  { href: "/hq/settings", label: "Settings", roles: ["PLATFORM_ADMIN", "PLATFORM_OPS"] }
];

export function HQShell({ children, role, userEmail }: PropsWithChildren<{ role: string; userEmail: string }>) {
  const visible = nav.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_48%,#eef2ff_100%)] text-slate-900">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">InternFlow HQ</p>
            <p className="text-lg font-semibold">Platform Console</p>
          </div>
          <nav className="space-y-1">
            {visible.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100/90 hover:shadow-sm">{item.label}</Link>
            ))}
          </nav>
        </aside>

        <div>
          <header className="sticky top-0 z-10 border-b border-white/70 bg-white/70 px-6 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">HQ Role: <span className="font-semibold text-slate-900">{role}</span></p>
              <div className="flex items-center gap-3 text-sm">
                <p className="text-slate-600">{userEmail}</p>
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Log out</button>
                </form>
              </div>
            </div>
          </header>
          <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6">
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
