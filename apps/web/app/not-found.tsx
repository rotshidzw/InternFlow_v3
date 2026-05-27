import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function NotFoundPage() {
  return (
    <SiteShell>
      <section className="relative flex min-h-[68vh] items-center justify-center py-8">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-20" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(168,85,247,0.24) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.2) 1px, transparent 1px)",
              backgroundSize: "54px 54px",
            }}
          />
        </div>

        <div className="if-panel mx-auto w-full max-w-3xl overflow-hidden p-7 sm:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">
            404 / Route unavailable
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-brand-text sm:text-4xl">Page not found</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-textSoft sm:text-base">
            The page you requested could not be found. The link may be invalid, or the content may
            have moved to a new route.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/" className="if-btn if-btn-primary px-4 py-2">
              Go Home
            </Link>
            <Link href="/contact" className="if-btn if-btn-secondary px-4 py-2">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
