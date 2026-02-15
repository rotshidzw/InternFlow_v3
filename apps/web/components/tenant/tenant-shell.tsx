"use client";

import Link from "next/link";
import { useEffect, useState, type PropsWithChildren } from "react";
import { motion } from "framer-motion";

const items = [
  ["dashboard", "Dashboard"],
  ["programs", "Programs"],
  ["templates", "Templates"],
  ["opportunities", "Opportunities"],
  ["applicants", "Applicants"],
  ["enrollments", "Enrollments"],
  ["documents", "Documents"],
  ["logbooks", "Logbooks"],
  ["approvals", "Approvals"],
  ["reports", "Reports"],
  ["stipends", "Stipends"],
  ["staff", "Staff"],
  ["settings", "Settings"]
] as const;

export function TenantShell({ children, orgSlug, orgName, role }: PropsWithChildren<{ orgSlug: string; orgName: string; role: string }>) {
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
      ? "bg-[radial-gradient(circle_at_top,#dbeafe_0%,#e2e8f0_40%,#f8fafc_100%)]"
      : "bg-[radial-gradient(circle_at_top,#cffafe_0%,#dbeafe_35%,#ede9fe_75%,#f8fafc_100%)]";

  return (
    <div className={`min-h-screen ${shellBg} text-slate-900 transition-colors`}>
      <div className={`grid min-h-screen ${collapsed ? "md:grid-cols-[88px_1fr]" : "md:grid-cols-[280px_1fr]"}`}>
        <aside className="border-r border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-2">
            {!collapsed ? <p className="text-sm font-semibold">{orgName}</p> : <p className="text-sm font-semibold">IF</p>}
            <button type="button" onClick={() => setCollapsed((v) => !v)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">{collapsed ? ">" : "<"}</button>
          </div>
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Tenant portal</p>
          <nav className="space-y-1">
            {items.map(([href, label]) => (
              <Link key={href} href={`/org/${orgSlug}/app/${href}`} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">{collapsed ? label.slice(0, 2) : label}</Link>
            ))}
          </nav>
        </aside>
        <div>
          <header className="sticky top-0 z-10 border-b border-white/70 bg-white/70 px-6 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">InternFlow</p>
                <p className="font-semibold">{orgName} · {role.replace("_", " ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <input placeholder="Search learners, opportunities..." className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
                <button type="button" onClick={toggleTheme} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs">Theme: {theme === "soft" ? "Soft" : "Vivid"}</button>
                <form action="/api/auth/logout" method="post"><button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs">Logout</button></form>
              </div>
            </div>
          </header>
          <motion.main initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6">
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
