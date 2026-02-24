"use client";

import Image from "next/image";
import Link from "next/link";
import { PropsWithChildren, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/#product", label: "Product" },
  { href: "/#how", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#security", label: "Security" },
];

export function SiteShell({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[radial-gradient(circle_at_top,#134e4a_0%,#0f172a_40%,#020617_100%)] dark:text-slate-100">
      <div
        className="animated-bg-overlay pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-emerald-600 dark:text-emerald-300"
            >
              <Image
                src="/icon-512.svg"
                alt="InternFlow logo"
                width={32}
                height={32}
                className="rounded-lg"
                priority
              />
              <span>InternFlow</span>
            </Link>

            <div className="hidden items-center gap-4 text-sm md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/auth/setup?mode=join"
                className="rounded-lg border border-slate-300 px-3 py-1 dark:border-white/20"
              >
                Student Join
              </Link>
              <Link
                href="/auth"
                className="rounded-lg border border-emerald-300/50 px-3 py-1 text-emerald-700 dark:text-emerald-200"
              >
                Login
              </Link>
              <Link
                href="/onboarding/create-org"
                className="rounded-lg border border-slate-300 px-3 py-1 dark:border-white/20"
              >
                Register Organization
              </Link>
              <ThemeToggle />
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                type="button"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((open) => !open)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20"
              >
                ☰
              </button>
            </div>
          </nav>

          {mobileOpen && (
            <div className="border-t border-slate-200 bg-white/95 px-4 py-3 dark:border-white/10 dark:bg-slate-950/95 md:hidden">
              <div className="flex flex-col gap-2 text-sm">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/auth/setup?mode=join"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-center dark:border-white/25"
                >
                  Student Join
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-emerald-300/50 px-3 py-2 text-center text-emerald-700 dark:text-emerald-200"
                >
                  Login
                </Link>
                <Link
                  href="/onboarding/create-org"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-emerald-500 px-3 py-2 text-center font-semibold text-slate-950"
                >
                  Register Organization
                </Link>
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <footer className="border-t border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-slate-950/50">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 dark:text-slate-300 md:flex-row md:items-center md:justify-between">
            <p>
              InternFlow · Multi-organisation internship and learnership
              operations.
            </p>
            <div className="flex gap-3">
              <Link href="/onboarding/create-org">Register Organization</Link>
              <Link href="/auth">Login</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
