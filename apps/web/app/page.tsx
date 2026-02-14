import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";

export default function HomePage() {
  return (
    <SiteShell>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">InternFlow: one source of truth for internship operations.</h1>
          <p className="text-slate-600 dark:text-slate-300">From onboarding to compliance exports, InternFlow helps coordinators reduce manual follow-ups and missing documents.</p>
          <div className="flex gap-3">
            <Link href="/demo" className="rounded-xl bg-emerald-600 px-4 py-2 text-white">Watch Demo</Link>
            <Link href="/auth/login" className="rounded-xl border px-4 py-2">Start Free</Link>
          </div>
        </div>
        <AnimatedCard>
          <h2 className="mb-3 text-xl font-semibold">How it works</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Student applies and uploads required documents.</li>
            <li>Supervisor reviews weekly logbook evidence.</li>
            <li>Coordinator tracks compliance and exports registers.</li>
          </ol>
        </AnimatedCard>
      </section>
    </SiteShell>
  );
}
