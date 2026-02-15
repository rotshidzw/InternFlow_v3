import Link from "next/link";
import { PropsWithChildren } from "react";

const roleNav: Record<string, { href: string; label: string }[]> = {
  STUDENT: [
    { href: "student", label: "Dashboard" },
    { href: "student", label: "Applications" },
    { href: "student", label: "Documents" }
  ],
  COORDINATOR: [
    { href: "coordinator", label: "Cohorts" },
    { href: "coordinator", label: "Compliance" },
    { href: "coordinator", label: "Approvals" }
  ],
  PROVIDER_ADMIN: [
    { href: "provider-admin", label: "Org Profile" },
    { href: "provider-admin", label: "Opportunities" },
    { href: "provider-admin", label: "People" }
  ],
  SUPERVISOR: [
    { href: "supervisor", label: "Learners" },
    { href: "supervisor", label: "Logbooks" }
  ]
};

export function AppShell({ children, orgSlug, role, orgName }: PropsWithChildren<{ orgSlug: string; role: string; orgName: string }>) {
  const items = roleNav[role] ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f766e_0%,#0f172a_40%,#020617_100%)] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="InternFlow" className="h-8 w-8 rounded-lg" />
            <div>
              <p className="text-sm font-semibold">{orgName}</p>
              <p className="text-xs text-emerald-300">Workspace · {role.replace("_", " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {role === "SYSTEM_ADMIN" && <Link href="/hq/dashboard">HQ</Link>}
            <Link href="/workspaces">Switch workspace</Link>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs">{orgSlug}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-slate-300">Navigation</p>
          <nav className="space-y-2 text-sm">
            {items.map((item) => (
              <Link key={item.label} href={`/org/${orgSlug}/${item.href}`} className="block rounded-lg border border-white/10 px-3 py-2 hover:bg-white/10">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">{children}</main>
      </div>
    </div>
  );
}
