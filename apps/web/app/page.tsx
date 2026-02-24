"use client";

import Link from "next/link";
import { FadeInSection } from "@/components/fade-in-section";
import { SiteShell } from "@/components/site-shell";
import { AudienceCTA } from "@/components/home/audience-cta";
import { HowItWorks } from "@/components/home/how-it-works";
import { ScreenshotGallery } from "@/components/home/screenshot-gallery";
import { TrustSection } from "@/components/home/trust-section";
import { AnimatedCard } from "@/components/animated-card";

const adminDepth = [
  {
    title: "Onboarding operations",
    detail:
      "Structured learner intake with role-scoped workflows for providers, coordinators, and supervisors.",
  },
  {
    title: "Documentation lifecycle",
    detail:
      "Submission queues, verification states, version history, and compliance checkpoints in one place.",
  },
  {
    title: "Monitoring and approvals",
    detail:
      "Logbook follow-up, pending action tracking, and escalation visibility for programme teams.",
  },
  {
    title: "Reporting and exports",
    detail:
      "Pilot-ready reports and export options for audit discussions, programme reviews, and funder updates.",
  },
];

export default function HomePage() {
  return (
    <SiteShell>
      <div className="space-y-12 md:space-y-16">
        <FadeInSection>
          <section id="product" className="space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
              InternFlow platform
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
              Multi-organisation internship operations, built for real program
              delivery.
            </h1>
            <p className="max-w-4xl text-lg text-slate-700 dark:text-slate-200">
              Onboarding, document compliance, logbooks, and reporting — in one
              operational system.
            </p>
            <p className="max-w-4xl text-sm text-slate-600 dark:text-slate-300">
              InternFlow is built to assist with admin-heavy programme work:
              learner onboarding, documentation, approvals, oversight, and
              audit-ready evidence trails. Teams can run pilots with less manual
              chasing and clearer accountability.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/onboarding/create-org"
                className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-slate-950"
              >
                Register Organisation
              </Link>
              <Link
                href="/onboarding/profile"
                className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-white/30"
              >
                Student: Create profile
              </Link>
              <Link
                href="/auth/setup?mode=join"
                className="rounded-lg border border-emerald-300/70 px-3 py-1.5 text-emerald-700 dark:text-emerald-200"
              >
                Student Join via Invite
              </Link>
              <Link
                href="/auth"
                className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-white/30"
              >
                Login
              </Link>
              <Link
                href="/demo"
                className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-white/30"
              >
                Try Demo
              </Link>
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <AudienceCTA />
        </FadeInSection>

        <FadeInSection>
          <section id="ops-depth" className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              Admin operations depth
            </p>
            <h2 className="text-3xl font-semibold">
              Built for the real day-to-day work
            </h2>
            <p className="max-w-4xl text-sm text-slate-600 dark:text-slate-300">
              This system is designed to support programme teams doing
              operational work every day, not only showcase dashboards. It helps
              with handovers, documentation control, action tracking, and
              consistent reporting.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {adminDepth.map((item) => (
                <AnimatedCard key={item.title}>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {item.detail}
                  </p>
                </AnimatedCard>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/demo"
                className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-white/30"
              >
                Try Demo
              </Link>
              <Link
                href="/auth"
                className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-white/30"
              >
                Login
              </Link>
              <Link
                href="/onboarding/create-org"
                className="rounded-lg border border-emerald-300/70 px-3 py-1.5 text-emerald-700 dark:text-emerald-200"
              >
                Register Organisation
              </Link>
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <HowItWorks />
        </FadeInSection>

        <FadeInSection>
          <ScreenshotGallery />
        </FadeInSection>

        <FadeInSection>
          <TrustSection />
        </FadeInSection>
      </div>
    </SiteShell>
  );
}
