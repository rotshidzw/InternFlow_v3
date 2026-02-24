"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { FadeInSection } from "@/components/fade-in-section";
import { MotionLinkButton } from "@/components/motion-link-button";

const AnimatedCounter = dynamic(
  () =>
    import("@/components/animated-counter").then((mod) => mod.AnimatedCounter),
  { ssr: false },
);

const modules = [
  {
    title: "Onboarding",
    description:
      "Role-based onboarding journeys for each organisation's students and staff.",
  },
  {
    title: "Applications",
    description:
      "Track submitted, review, accepted, and rejected applicants per organisation.",
  },
  {
    title: "Documents",
    description:
      "Upload to secure object storage with version history and verification statuses.",
  },
  {
    title: "Logbook",
    description:
      "Weekly submissions, supervisor approvals, and coordinator oversight.",
  },
  {
    title: "Payments",
    description: "Payslip and stipend tracking with searchable records.",
  },
  {
    title: "Support",
    description:
      "Support tickets and operational alerts with SLA-ready workflows.",
  },
];

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <SiteShell>
      <div className="space-y-10">
        <FadeInSection>
          <section
            id="product"
            className="grid gap-6 md:grid-cols-2 md:items-center"
          >
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                InternFlow platform
              </p>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Multi-organisation internship operations, built for real program
                delivery.
              </h1>
              <p className="text-slate-700 dark:text-slate-200">
                Organisations first register with InternFlow, get their own
                isolated workspace, then manage student applications, approvals,
                and compliance from one polished platform.
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-200">
                Students do not create organisations. Use an invite link/token
                to join a tenant, then apply for internships in that
                organisation.
              </p>
              <div className="flex flex-wrap gap-3">
                <MotionLinkButton
                  href="/demo"
                  label="Try Demo"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950 shadow-sm transition-shadow hover:shadow-[0_10px_30px_rgba(16,185,129,0.35)]"
                />
                <Link
                  href="/auth/setup?mode=join"
                  className="rounded-xl border border-emerald-300/70 px-4 py-2 text-emerald-700 dark:text-emerald-200"
                >
                  Student Join via Invite
                </Link>
                <Link
                  href="/auth"
                  className="rounded-xl border border-slate-300 px-4 py-2 dark:border-white/30"
                >
                  Login
                </Link>
                <Link
                  href="/onboarding/create-org"
                  className="rounded-xl border border-emerald-300/70 px-4 py-2 text-emerald-700 dark:text-emerald-200"
                >
                  Register Organization
                </Link>
              </div>
            </div>

            <motion.div
              animate={prefersReducedMotion ? undefined : { y: [0, -8, 0] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 7,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "easeInOut",
                    }
              }
            >
              <AnimatedCard>
                <h2 className="text-xl font-semibold">Platform flow</h2>
                <ol className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-100">
                  <li>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      1. Organisation onboarding:
                    </span>{" "}
                    company creates account and workspace.
                  </li>
                  <li>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      2. Program setup:
                    </span>{" "}
                    organisation configures opportunities and requirements.
                  </li>
                  <li>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      3. Student lifecycle:
                    </span>{" "}
                    apply → review → accepted/rejected → ongoing tracking.
                  </li>
                </ol>
              </AnimatedCard>
            </motion.div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Compliance", target: 95, suffix: "%" },
              { label: "Admin reduction", target: 60, suffix: "%" },
              { label: "Workspaces", target: 120, suffix: "+" },
              { label: "Onboarding SLA", target: 14, suffix: "d" },
            ].map((stat) => (
              <AnimatedCard key={stat.label}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-700 dark:text-emerald-200">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </p>
              </AnimatedCard>
            ))}
          </section>
        </FadeInSection>

        <section id="how" className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <AnimatedCard key={module.title}>
              <h3 className="text-lg font-semibold">{module.title}</h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                {module.description}
              </p>
            </AnimatedCard>
          ))}
        </section>

        <FadeInSection>
          <section id="security" className="grid gap-4 md:grid-cols-2">
            <AnimatedCard>
              <h3 className="text-xl font-semibold">
                Tenant isolation by design
              </h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                Every organisation operates in its own data boundary. Teams
                manage their own users, programs, and student records without
                cross-tenant leakage.
              </p>
            </AnimatedCard>
            <AnimatedCard>
              <h3 className="text-xl font-semibold">
                Compliance + POPIA posture
              </h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                Auditable events, role-scoped access, secure object storage, and
                export-ready reporting are built into daily workflows.
              </p>
            </AnimatedCard>
          </section>
        </FadeInSection>
      </div>
    </SiteShell>
  );
}
