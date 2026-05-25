"use client";

import Image from "next/image";
import Link from "next/link";
import { PropsWithChildren, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/#product", label: "Product" },
  { href: "/#how", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/#security", label: "Security" },
];

export function SiteShell({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-bg text-brand-text">
      <div className="animated-bg-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.25) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-brand-border/70 bg-[#070913]/86 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/icon-512.svg"
                alt="InternFlow logo"
                width={34}
                height={34}
                className="rounded-lg ring-1 ring-brand-accent/45"
                priority
              />
              <div>
                <p className="text-lg font-semibold tracking-tight text-brand-text">
                  InternFlow
                </p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-brand-muted">
                  Enterprise Operations Intelligence
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-3 text-sm md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-transparent px-2.5 py-1.5 text-brand-muted transition hover:border-brand-border hover:text-brand-text"
                >
                  {link.label}
                </a>
              ))}
              <Link href="/auth/setup?mode=join" className="if-btn if-btn-secondary text-xs">
                Student Join
              </Link>
              <Link href="/auth" className="if-btn if-btn-primary text-xs">
                Login
              </Link>
              <Link href="/onboarding/create-org" className="if-btn if-btn-secondary text-xs">
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
                className="if-btn if-btn-secondary px-3 py-2 text-sm"
              >
                Menu
              </button>
            </div>
          </nav>

          {mobileOpen && (
            <div className="border-t border-brand-border/70 bg-[#090a1a]/95 px-4 py-3 md:hidden">
              <div className="flex flex-col gap-2 text-sm">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-transparent px-3 py-2 text-brand-muted transition hover:border-brand-border hover:text-brand-text"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href="/auth/setup?mode=join"
                  onClick={() => setMobileOpen(false)}
                  className="if-btn if-btn-secondary"
                >
                  Student Join
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="if-btn if-btn-primary"
                >
                  Login
                </Link>
                <Link
                  href="/onboarding/create-org"
                  onClick={() => setMobileOpen(false)}
                  className="if-btn if-btn-secondary"
                >
                  Register Organization
                </Link>
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <footer className="border-t border-brand-border/70 bg-[#070916]/72">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-brand-muted md:flex-row md:items-center md:justify-between">
            <p>InternFlow - Premium operations system for skills development workflows.</p>
            <div className="flex gap-3">
              <Link href="/onboarding/create-org" className="hover:text-brand-text">
                Register Organization
              </Link>
              <Link href="/auth" className="hover:text-brand-text">
                Login
              </Link>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-6 text-xs text-brand-muted/80">
            Founder: Mavhungu Rotshidzwa Chester - Developer - Systems Support - AI Engineer
          </div>
        </footer>
      </div>
    </div>
  );
}
