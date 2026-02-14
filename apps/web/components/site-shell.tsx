import Link from "next/link";
import { PropsWithChildren } from "react";

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <div>
      <header className="border-b bg-white/80 backdrop-blur dark:bg-slate-900/80">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-emerald-600">InternFlow</Link>
          <div className="flex gap-4 text-sm">
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/demo">Demo</Link>
            <Link href="/auth/login">Login</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
