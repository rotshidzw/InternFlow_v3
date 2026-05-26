"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ContactLauncher } from "@/components/marketing/contact-launcher";
import { contactConfig } from "@/lib/contact-config";

const marketingLinks = [
  { href: "/", label: "Home" },
  { href: "/solutions", label: "Solutions" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact Us" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const navKey = useMemo(() => {
    return marketingLinks.find((link) => link.href === pathname)?.href ?? null;
  }, [pathname]);

  useEffect(() => {
    if (searchParams.get("intent") === "demo") {
      setContactOpen(true);
    }
  }, [searchParams]);

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
        <header className="if-site-header sticky top-0 z-30 border-b border-brand-border/70 bg-[#070913]/90 backdrop-blur-xl">
          <nav className="mx-auto flex h-[94px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/internflow-logo.png"
                alt="InternFlow logo"
                width={236}
                height={84}
                className="h-14 w-auto drop-shadow-[0_0_16px_rgba(168,85,247,0.28)]"
                priority
              />
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-between gap-6 md:flex">
              <div className="ml-7 flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1">
                {marketingLinks.map((link) => {
                  const active = navKey === link.href;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`if-nav-link ${active ? "border-brand-border/80 bg-brand-surface text-brand-text shadow-[0_0_0_1px_rgba(168,85,247,0.2)]" : "text-brand-muted"}`}
                      aria-current={active ? "page" : undefined}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <Link href="/auth/login" className="if-btn if-btn-secondary if-btn-nav">
                  Login
                </Link>
                <Link
                  href="/register-organization"
                  className="if-btn if-btn-secondary if-btn-nav hidden xl:inline-flex"
                >
                  Register Organization
                </Link>
                <button
                  type="button"
                  className="if-btn if-btn-secondary if-btn-nav"
                  onClick={() => setContactOpen(true)}
                >
                  Chat with Us
                </button>
                <Link href="/contact?intent=demo" className="if-btn if-btn-primary if-btn-nav">
                  Request Demo
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((open) => !open)}
                className="if-btn if-btn-secondary if-btn-nav text-xs"
              >
                Menu
              </button>
            </div>
          </nav>

          {mobileOpen && (
            <div className="if-site-mobile-nav border-t border-brand-border/70 bg-[#090a1a]/95 px-4 py-3 md:hidden">
              <div className="flex flex-col gap-3 text-sm">
                <div className="rounded-xl border border-brand-border/60 bg-brand-surface/50 p-2">
                  {marketingLinks.map((link) => {
                    const active = navKey === link.href;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`if-nav-link w-full justify-between ${active ? "border-brand-border bg-brand-surface text-brand-text" : ""}`}
                      >
                        {link.label}
                      </a>
                    );
                  })}
                </div>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="if-btn if-btn-secondary if-btn-nav"
                >
                  Login
                </Link>
                <Link
                  href="/register-organization"
                  onClick={() => setMobileOpen(false)}
                  className="if-btn if-btn-secondary if-btn-nav"
                >
                  Register Organization
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setContactOpen(true);
                  }}
                  className="if-btn if-btn-secondary if-btn-nav"
                >
                  Chat with Us
                </button>
                <Link
                  href="/contact?intent=demo"
                  onClick={() => setMobileOpen(false)}
                  className="if-btn if-btn-primary if-btn-nav"
                >
                  Request Demo
                </Link>
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10">{children}</main>
        <footer className="if-site-footer border-t border-brand-border/70 bg-[#070916]/72">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="space-y-2 text-sm text-brand-muted">
              <p className="text-base font-semibold text-brand-text">{contactConfig.companyName}</p>
              <p>{contactConfig.supportLine}</p>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {contactConfig.socials.map((social) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="if-btn if-btn-secondary px-2 py-1"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-sm text-brand-muted">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-accentStrong">Quick Links</p>
              {contactConfig.footer.quickLinks.map((link) => (
                <a key={link.href} href={link.href} className="block hover:text-brand-text">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="space-y-2 text-sm text-brand-muted">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-accentStrong">Company</p>
              {contactConfig.footer.companyLinks.map((link) => (
                <a key={link.href} href={link.href} className="block hover:text-brand-text">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="space-y-2 text-sm text-brand-muted">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-accentStrong">Contact</p>
              <a href={contactConfig.phoneHref} className="block hover:text-brand-text">{contactConfig.phoneDisplayIntl}</a>
              <a href={contactConfig.whatsappHref} target="_blank" rel="noreferrer" className="block hover:text-brand-text">WhatsApp</a>
              <a href={contactConfig.emailHref} className="block hover:text-brand-text">{contactConfig.emailAddress}</a>
              <div className="pt-1 text-xs">
                {contactConfig.footer.supportLinks.map((link) => (
                  <a key={link.href} href={link.href} className="block py-0.5 hover:text-brand-text">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-brand-border/60 px-4 py-4 text-xs text-brand-muted/80">
            <p>Copyright {currentYear} {contactConfig.companyName}. All rights reserved.</p>
            <div className="flex flex-wrap gap-3">
              {contactConfig.footer.legalLinks.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-brand-text">
                  {link.label}
                </a>
              ))}
            </div>
            <p>Founder: Mavhungu Rotshidzwa Chester - Developer - Systems Support - AI Engineer</p>
          </div>
        </footer>
      </div>

      <ContactLauncher
        open={contactOpen}
        setOpen={setContactOpen}
        demoIntent={searchParams.get("intent") === "demo"}
      />
    </div>
  );
}
