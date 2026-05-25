"use client";

import Image from "next/image";
import Link from "next/link";
import { PropsWithChildren, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const marketingLinks = [
  { href: "/#product", label: "Product" },
  { href: "/solutions", label: "Solutions" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
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
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/internflow-logo.png"
                alt="InternFlow logo"
                width={180}
                height={64}
                className="h-10 w-auto drop-shadow-[0_0_14px_rgba(168,85,247,0.22)]"
                priority
              />
              <p className="hidden text-[10px] uppercase tracking-[0.24em] text-brand-muted lg:block">
                Enterprise Operations Intelligence
              </p>
            </Link>

            <div className="hidden flex-1 items-center justify-between gap-6 md:flex">
              <div className="ml-8 flex items-center gap-1 text-sm">
                {marketingLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-lg border border-transparent px-3 py-2 text-brand-muted transition hover:border-brand-border hover:text-brand-text"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Link href="/auth" className="if-btn if-btn-secondary text-xs">
                  Login
                </Link>
                <Link href="/demo" className="if-btn if-btn-primary text-xs">
                  Request Demo
                </Link>
                <Link href="/onboarding/create-org" className="if-btn if-btn-secondary text-xs">
                  Register Organization
                </Link>
                <ThemeToggle />
              </div>
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
              <div className="flex flex-col gap-3 text-sm">
                <div className="rounded-xl border border-brand-border/60 bg-brand-surface/50 p-2">
                  {marketingLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg border border-transparent px-3 py-2 text-brand-muted transition hover:border-brand-border hover:text-brand-text"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <Link href="/auth" onClick={() => setMobileOpen(false)} className="if-btn if-btn-secondary">
                  Login
                </Link>
                <Link href="/demo" onClick={() => setMobileOpen(false)} className="if-btn if-btn-primary">
                  Request Demo
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

        <main className="mx-auto max-w-7xl px-4 py-10">{children}</main>
        <footer className="border-t border-brand-border/70 bg-[#070916]/72">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-2 text-sm text-brand-muted">
              <p className="text-base font-semibold text-brand-text">InternFlow</p>
              <p>
                Enterprise operations platform for internship, learnership, and skills programme
                delivery with audit-ready control.
              </p>
            </div>
            <div className="space-y-2 text-sm text-brand-muted">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-accentStrong">Product</p>
              <a href="/#product" className="block hover:text-brand-text">Overview</a>
              <a href="/solutions" className="block hover:text-brand-text">Solutions</a>
              <a href="/how-it-works" className="block hover:text-brand-text">How It Works</a>
              <a href="/security" className="block hover:text-brand-text">Security</a>
            </div>
            <div className="space-y-2 text-sm text-brand-muted">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-accentStrong">Company</p>
              <a href="/about" className="block hover:text-brand-text">About</a>
              <a href="/pricing" className="block hover:text-brand-text">Pricing</a>
              <a href="/auth" className="block hover:text-brand-text">Login</a>
              <a href="/onboarding/create-org" className="block hover:text-brand-text">Register Organization</a>
            </div>
          </div>
          <div className="mx-auto max-w-7xl border-t border-brand-border/60 px-4 py-4 text-xs text-brand-muted/80">
            Founder: Mavhungu Rotshidzwa Chester - Developer - Systems Support - AI Engineer
          </div>
        </footer>
      </div>
    </div>
  );
}
