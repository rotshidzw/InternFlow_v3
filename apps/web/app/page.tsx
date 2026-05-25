"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { FadeInSection } from "@/components/fade-in-section";
import { MotionLinkButton } from "@/components/motion-link-button";

const AnimatedCounter = dynamic(
  () => import("@/components/animated-counter").then((mod) => mod.AnimatedCounter),
  { ssr: false },
);

const modules = [
  {
    title: "Onboarding",
    description: "Role-based onboarding journeys for each organisation's students and staff.",
  },
  {
    title: "Applications",
    description: "Track submitted, review, accepted, and rejected applicants per organisation.",
  },
  {
    title: "Documents",
    description: "Secure uploads, version history, and verification states in one evidence trail.",
  },
  {
    title: "Logbook",
    description: "Weekly submissions, supervisor approvals, and coordinator oversight.",
  },
  {
    title: "Payments",
    description: "Payslip and stipend operations with structured, searchable records.",
  },
  {
    title: "Support",
    description: "Operational support tickets and alerts with clear accountability paths.",
  },
];

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <SiteShell>
      <div className="space-y-10">
        <FadeInSection>
          <section id="product" className="grid gap-6 md:grid-cols-2 md:items-center">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.22em] text-brand-accentStrong">InternFlow platform</p>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Multi-organisation internship operations, built for real programme delivery.
              </h1>
              <p className="text-brand-textSoft">
                Organisations register once, get isolated workspaces, and manage application,
                compliance, evidence, and reporting lifecycles from one premium system dashboard.
              </p>
              <p className="text-sm text-brand-muted">
                Students join through invite-driven tenant access, then progress through clear
                lifecycle and compliance steps.
              </p>
              <div className="flex flex-wrap gap-3">
                <MotionLinkButton href="/demo" label="Try Demo" className="if-btn if-btn-primary px-4 py-2" />
                <Link href="/auth/setup?mode=join" className="if-btn if-btn-secondary px-4 py-2">
                  Student Join via Invite
                </Link>
                <Link href="/auth" className="if-btn if-btn-secondary px-4 py-2">
                  Login
                </Link>
                <Link href="/onboarding/create-org" className="if-btn if-btn-secondary px-4 py-2">
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
                <h2 className="text-xl font-semibold text-brand-text">Platform flow</h2>
                <ol className="mt-3 space-y-2 text-sm text-brand-textSoft">
                  <li>
                    <span className="font-semibold text-brand-accentStrong">1. Organisation onboarding:</span>{" "}
                    company creates account and workspace.
                  </li>
                  <li>
                    <span className="font-semibold text-brand-accentStrong">2. Program setup:</span>{" "}
                    configure opportunities, requirements, and operations controls.
                  </li>
                  <li>
                    <span className="font-semibold text-brand-accentStrong">3. Student lifecycle:</span>{" "}
                    apply to review, accepted or rejected, and monitored programme delivery.
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
                <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-brand-accentStrong">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </p>
              </AnimatedCard>
            ))}
          </section>
        </FadeInSection>

        <section id="how" className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <AnimatedCard key={module.title}>
              <h3 className="text-lg font-semibold text-brand-text">{module.title}</h3>
              <p className="mt-2 text-sm text-brand-textSoft">{module.description}</p>
            </AnimatedCard>
          ))}
        </section>

        <FadeInSection>
          <section id="security" className="grid gap-4 md:grid-cols-2">
            <AnimatedCard>
              <h3 className="text-xl font-semibold text-brand-text">Tenant isolation by design</h3>
              <p className="mt-2 text-sm text-brand-textSoft">
                Every organisation operates in its own data boundary with role-scoped access and
                audit-grade traceability.
              </p>
            </AnimatedCard>
            <AnimatedCard>
              <h3 className="text-xl font-semibold text-brand-text">Compliance and POPIA posture</h3>
              <p className="mt-2 text-sm text-brand-textSoft">
                Auditable events, secure evidence handling, and export-ready reporting are embedded
                into day-to-day operations.
              </p>
            </AnimatedCard>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section id="founder" className="if-panel grid gap-6 p-6 md:grid-cols-[120px_1fr] md:items-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border border-brand-border bg-brand-surface text-xs uppercase tracking-[0.18em] text-brand-muted">
              Founder Image
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">Founder</p>
              <h2 className="text-2xl font-semibold text-brand-text">Mavhungu Rotshidzwa Chester</h2>
              <p className="text-sm text-brand-muted">Developer • Systems Support • Problem Solver</p>
              <p className="text-sm leading-relaxed text-brand-textSoft">
                Chester is the founder behind InternFlow. The platform was created to solve real
                operational and audit challenges in training, learnership, internship, and skills
                development programmes. InternFlow focuses on practical control, clear workflow
                visibility, and evidence-ready programme operations for modern delivery teams.
              </p>
            </div>
          </section>
        </FadeInSection>
      </div>
    </SiteShell>
  );
}
