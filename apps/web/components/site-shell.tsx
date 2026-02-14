import Link from "next/link";
import { PropsWithChildren } from "react";

const demoLinks = [
  { href: "/demo", label: "Try Demo" },
  { href: "/app/student", label: "Student Demo" },
  { href: "/app/provider", label: "Provider Demo" },
  { href: "/app/coordinator", label: "Coordinator Demo" }
];

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#134e4a_0%,#0f172a_40%,#020617_100%)] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-xl font-bold text-emerald-300">InternFlow</Link>
          <div className="hidden gap-4 text-sm md:flex">
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
            {demoLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            <Link href="/auth/login">Login</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      <footer className="border-t border-white/10 bg-slate-950/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <p>InternFlow · Learnership operations for multi-organisation programs.</p>
          <div className="flex flex-wrap gap-3">
            {demoLinks.map((link) => <Link key={`footer-${link.href}`} href={link.href} className="hover:text-emerald-300">{link.label}</Link>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
