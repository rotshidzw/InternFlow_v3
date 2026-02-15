"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

const nav = [
  ["/hq/dashboard", "Dashboard"],
  ["/hq/tenants", "Tenants"],
  ["/hq/approvals", "Approvals"],
  ["/hq/meetings", "Meetings"],
  ["/hq/support", "Support"],
  ["/hq/observability", "Observability"],
  ["/hq/users", "HQ Users"],
  ["/hq/settings", "Settings"]
];

export function HQShell({ children, role, userEmail }: PropsWithChildren<{ role: string; userEmail: string }>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_48%,#eef2ff_100%)] text-slate-900">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">InternFlow HQ</p>
            <p className="text-lg font-semibold">Platform Console</p>
          </div>
          <nav className="space-y-1">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100/90 hover:shadow-sm">{label}</Link>
            ))}
          </nav>
        </aside>

        <div>
          <header className="sticky top-0 z-10 border-b border-white/70 bg-white/70 px-6 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">HQ Role: <span className="font-semibold text-slate-900">{role}</span></p>
              <p className="text-sm text-slate-600">{userEmail}</p>
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
