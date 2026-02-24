"use client";

import Image from "next/image";
import Link from "next/link";
import { PropsWithChildren, useState } from "react";

const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#inside", label: "Inside InternFlow" },
  { href: "/#trust", label: "Trust & Security" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteShell({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#134e4a_0%,#0f172a_40%,#020617_100%)] text-slate-100">
      <div
        className="animated-bg-overlay pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/icon-512.svg"
                alt="InternFlow"
                width={36}
                height={36}
                className="rounded-lg"
                priority
              />
              <span className="text-xl font-bold text-emerald-300">
                InternFlow
              </span>
            </Link>

            <div className="hidden items-center gap-4 text-sm md:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <Link
                href="/auth/setup?mode=join"
                className="rounded-lg border border-white/25 px-3 py-1"
              >
                Student: Get Started
              </Link>
              <Link
                href="/onboarding/create-org"
                className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-slate-950"
              >
                Register Organisation
              </Link>
              <Link
                href="/auth/setup?mode=join"
                className="text-emerald-200 underline-offset-4 hover:underline"
              >
                Student Join via Invite
              </Link>
              <Link href="/auth" className="underline-offset-4 hover:underline">
                Login
              </Link>
            </div>

            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm md:hidden"
            >
              ☰
            </button>
          </nav>

          {mobileOpen && (
            <div className="border-t border-white/10 bg-slate-950/95 px-4 py-3 md:hidden">
              <div className="flex flex-col gap-2 text-sm">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-2 py-1 hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/onboarding/create-org"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-emerald-500 px-3 py-2 text-center font-semibold text-slate-950"
                >
                  Register Organisation
                </Link>
                <Link
                  href="/auth/setup?mode=join"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-white/25 px-3 py-2 text-center"
                >
                  Student: Get Started
                </Link>
                <Link
                  href="/auth/setup?mode=join"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-2 py-1 text-emerald-200"
                >
                  Student Join via Invite
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-2 py-1"
                >
                  Login
                </Link>
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <footer className="border-t border-white/10 bg-slate-950/50">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
            <p>
              InternFlow · Pilot-first internship and learnership operations.
            </p>
            <div className="flex gap-3">
              <Link href="/onboarding/create-org">Register Organisation</Link>
              <Link href="/onboarding/profile">Student profile</Link>
              <Link href="/auth">Login</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
