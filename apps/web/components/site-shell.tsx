import Link from "next/link";
import { PropsWithChildren } from "react";

export function SiteShell({ children }: PropsWithChildren) {
  const navLinks = [
    { href: "/#product", label: "Product" },
    { href: "/#how", label: "How it Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/#security", label: "Security" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#134e4a_0%,#0f172a_40%,#020617_100%)] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-emerald-300"
          >
            <img
              src="/icon.svg"
              alt="InternFlow logo"
              className="h-8 w-8 rounded-lg"
            />
            <span>InternFlow</span>
          </Link>
          <div className="hidden gap-4 text-sm md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link
              href="/auth"
              className="rounded-lg border border-white/20 px-3 py-1"
            >
              Student Register
            </Link>
            <Link
              href="/auth"
              className="rounded-lg border border-emerald-300/40 px-3 py-1 text-emerald-200"
            >
              Login
            </Link>
            <Link
              href="/onboarding/create-org"
              className="rounded-lg border border-white/20 px-3 py-1"
            >
              Register Organization
            </Link>
          </div>

          <details className="group relative md:hidden">
            <summary className="list-none cursor-pointer rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white">
              Menu
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/20 bg-slate-950/95 p-3 text-sm shadow-2xl">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-2 py-1 hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/auth"
                  className="rounded-md border border-white/20 px-2 py-1 text-center"
                >
                  Student Register
                </Link>
                <Link
                  href="/auth"
                  className="rounded-md border border-emerald-300/40 px-2 py-1 text-center text-emerald-200"
                >
                  Login
                </Link>
                <Link
                  href="/onboarding/create-org"
                  className="rounded-md border border-white/20 px-2 py-1 text-center"
                >
                  Register Organization
                </Link>
              </div>
            </div>
          </details>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      <footer className="border-t border-white/10 bg-slate-950/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
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
  );
}
