"use client";

import Link from "next/link";
import { FadeInSection } from "@/components/fade-in-section";
import { SiteShell } from "@/components/site-shell";
import { AudienceCTA } from "@/components/home/audience-cta";
import { HowItWorks } from "@/components/home/how-it-works";
import { ScreenshotGallery } from "@/components/home/screenshot-gallery";
import { TrustSection } from "@/components/home/trust-section";

export default function HomePage() {
  return (
    <SiteShell>
      <div className="space-y-12 md:space-y-16">
        <FadeInSection>
          <section id="product" className="space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">
              InternFlow platform
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
              Multi-organisation internship operations, built for real program
              delivery.
            </h1>
            <p className="max-w-4xl text-lg text-slate-200">
              Onboarding, document compliance, logbooks, and reporting — in one
              operational system.
            </p>
            <p className="max-w-4xl text-sm text-slate-300">
              InternFlow helps training providers and organisations run pilot
              programmes with clearer controls, student-ready onboarding paths,
              and audit-aware reporting.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/onboarding/create-org"
                className="rounded-lg border border-emerald-300/40 px-3 py-1 text-emerald-200"
              >
                Register Organisation
              </Link>
              <Link
                href="/onboarding/profile"
                className="rounded-lg border border-white/30 px-3 py-1"
              >
                Student: Create profile
              </Link>
              <Link
                href="/auth/setup?mode=join"
                className="rounded-lg border border-white/30 px-3 py-1"
              >
                Student Join via Invite
              </Link>
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <AudienceCTA />
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
