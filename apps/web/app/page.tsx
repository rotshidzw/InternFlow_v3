"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { FadeInSection } from "@/components/fade-in-section";
import { SectionHeading } from "@/components/marketing/section-heading";

const platformPillars = [
  {
    title: "Lifecycle Operations",
    description:
      "Intake to completion workflows across onboarding, applications, placement, attendance, and follow-up.",
  },
  {
    title: "Evidence & Documents",
    description:
      "Document capture, verification states, metadata traceability, and evidence alignment to programme controls.",
  },
  {
    title: "Financial Readiness",
    description:
      "Stipend tracking, proof-of-payment support, payslip handling, and operational cost capture in one control layer.",
  },
  {
    title: "Audit Visibility",
    description:
      "Role-scoped access, action logs, register outputs, and close-out evidence aligned to operational audit expectations.",
  },
];

const workflowSteps = [
  {
    title: "Provision Workspace",
    detail:
      "Organisation onboarding creates a secure tenant boundary with role-based operations access.",
  },
  {
    title: "Configure Programmes",
    detail:
      "Define opportunities, intake logic, required documents, registers, and governance controls.",
  },
  {
    title: "Run Delivery",
    detail:
      "Manage learners, compliance tasks, monthly operations, payment states, and progression checkpoints.",
  },
  {
    title: "Close Out with Evidence",
    detail:
      "Generate audit-ready exports with linked records for documents, registers, payments, and outcomes.",
  },
];

const roleValue = [
  {
    role: "Provider and Tenant Admin",
    value: "Own organisation setup, programme controls, workforce management, and operational decision visibility.",
  },
  {
    role: "Coordinators and Facilitators",
    value: "Track learner progress, attendance, approvals, and follow-up obligations with fewer manual gaps.",
  },
  {
    role: "Finance and Payroll Teams",
    value: "Monitor stipend eligibility, payment evidence, and operational spend with structured monthly controls.",
  },
  {
    role: "Auditors and Oversight",
    value: "Inspect immutable timelines, evidence lineage, and control outcomes without operational disruption.",
  },
];

const capabilityRows = [
  "Learner onboarding and profile progression",
  "Application review and status management",
  "Programme-based document requirements",
  "Attendance registers and sign-off traces",
  "Stipend, payslip, and proof workflows",
  "Certificate release and follow-up controls",
  "Role-specific operational dashboards",
  "Close-out and evidence export readiness",
];

const enterpriseBenefits = [
  "Reduce admin friction across multi-role delivery teams",
  "Increase control confidence during monthly operations",
  "Improve evidence quality for audits and funder reporting",
  "Scale programme delivery with a shared operating model",
];

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <SiteShell>
      <div className="space-y-14">
        <FadeInSection>
          <section id="product" className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-accentStrong">
                Enterprise Workflow Platform
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-brand-text md:text-5xl">
                InternFlow is the operating system for programme delivery, evidence, and audit readiness.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-brand-textSoft">
                Built for providers, coordinators, and operations teams managing real internship and
                learnership delivery. InternFlow connects lifecycle control, compliance evidence,
                and operational visibility in one enterprise-grade platform.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/demo" className="if-btn if-btn-primary px-4 py-2">
                  Request Demo
                </Link>
                <Link href="/onboarding/create-org" className="if-btn if-btn-secondary px-4 py-2">
                  Register Organization
                </Link>
                <Link href="/solutions" className="if-btn if-btn-secondary px-4 py-2">
                  Explore Solutions
                </Link>
              </div>
              <div className="grid gap-2 text-sm text-brand-muted sm:grid-cols-2">
                <p className="if-panel-muted px-3 py-2">Multi-organisation operations model</p>
                <p className="if-panel-muted px-3 py-2">Role-scoped workflow governance</p>
                <p className="if-panel-muted px-3 py-2">Evidence-first programme controls</p>
                <p className="if-panel-muted px-3 py-2">Audit-ready reporting posture</p>
              </div>
            </div>

            <motion.div
              animate={prefersReducedMotion ? undefined : { y: [0, -8, 0] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 7, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }
              }
              className="space-y-4"
            >
              <AnimatedCard>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-accentStrong">Control Surface</p>
                <h2 className="mt-2 text-2xl font-semibold text-brand-text">Programme Operations Board</h2>
                <div className="mt-4 grid gap-2 text-sm text-brand-textSoft">
                  <p className="if-panel-muted px-3 py-2">Applications and placement progression</p>
                  <p className="if-panel-muted px-3 py-2">Document, register, and evidence integrity</p>
                  <p className="if-panel-muted px-3 py-2">Stipend and payment traceability</p>
                  <p className="if-panel-muted px-3 py-2">Certificate and post-training follow-up readiness</p>
                </div>
              </AnimatedCard>
              <div className="grid gap-3 sm:grid-cols-2">
                <AnimatedCard>
                  <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Operational focus</p>
                  <p className="mt-2 text-sm text-brand-textSoft">
                    Minimize manual handovers and control gaps across delivery teams.
                  </p>
                </AnimatedCard>
                <AnimatedCard>
                  <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">Audit posture</p>
                  <p className="mt-2 text-sm text-brand-textSoft">
                    Maintain evidence lineage from learner activity through close-out reporting.
                  </p>
                </AnimatedCard>
              </div>
            </motion.div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section>
            <SectionHeading
              eyebrow="Trust and Value"
              title="Structured platform controls for real programme operations"
              subtitle="InternFlow is designed for organisations that require consistency, compliance, and operational confidence across every learner cohort."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {platformPillars.map((pillar) => (
                <AnimatedCard key={pillar.title}>
                  <h3 className="text-lg font-semibold text-brand-text">{pillar.title}</h3>
                  <p className="mt-2 text-sm text-brand-textSoft">{pillar.description}</p>
                </AnimatedCard>
              ))}
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section id="how">
            <SectionHeading
              eyebrow="How It Works"
              title="One operating flow from onboarding to audit evidence"
              subtitle="A practical process architecture for delivery teams who need predictable execution and reporting outcomes."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <AnimatedCard key={step.title}>
                  <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-brand-text">{step.title}</h3>
                  <p className="mt-2 text-sm text-brand-textSoft">{step.detail}</p>
                </AnimatedCard>
              ))}
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section>
            <SectionHeading
              eyebrow="Platform Capabilities"
              title="Operational breadth across the full programme lifecycle"
              subtitle="Everything teams need to track learner progress, evidence quality, compliance controls, and close-out readiness."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <AnimatedCard>
                <div className="grid gap-2 md:grid-cols-2">
                  {capabilityRows.map((row) => (
                    <div key={row} className="if-panel-muted rounded-xl px-3 py-2 text-sm text-brand-textSoft">
                      {row}
                    </div>
                  ))}
                </div>
              </AnimatedCard>
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-brand-text">Why operations teams adopt InternFlow</h3>
                <ul className="mt-3 space-y-2 text-sm text-brand-textSoft">
                  <li>Clear accountability across provider, coordinator, trainer, and finance roles.</li>
                  <li>Persistent operational history for every learner and programme checkpoint.</li>
                  <li>Fewer disconnected spreadsheets, threads, and evidence silos.</li>
                  <li>Enterprise posture for growth across multiple organisations and cohorts.</li>
                </ul>
              </AnimatedCard>
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section>
            <SectionHeading
              eyebrow="Role-Based Value"
              title="Designed for each function in programme delivery"
              subtitle="Every major role gets a practical control surface aligned to real responsibilities."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {roleValue.map((roleItem) => (
                <AnimatedCard key={roleItem.role}>
                  <h3 className="text-lg font-semibold text-brand-text">{roleItem.role}</h3>
                  <p className="mt-2 text-sm text-brand-textSoft">{roleItem.value}</p>
                </AnimatedCard>
              ))}
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section id="security">
            <SectionHeading
              eyebrow="Compliance and Evidence"
              title="Built for governance, traceability, and audit confidence"
              subtitle="InternFlow aligns operations with control expectations across documentation, attendance, payments, certificates, and follow-up timelines."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-brand-text">Evidence domains managed in-platform</h3>
                <ul className="mt-3 space-y-2 text-sm text-brand-textSoft">
                  <li>Document verification states and requirement alignment</li>
                  <li>Attendance registers with sign-off and review actions</li>
                  <li>Payment evidence, stipend state updates, and monthly records</li>
                  <li>Certificate release logic with policy-controlled timing</li>
                  <li>Post-training follow-up records and outcome status trails</li>
                </ul>
              </AnimatedCard>
              <AnimatedCard>
                <h3 className="text-lg font-semibold text-brand-text">Control principles</h3>
                <div className="mt-3 space-y-2 text-sm text-brand-textSoft">
                  <p className="if-panel-muted px-3 py-2">Role-based access and operational separation of duties</p>
                  <p className="if-panel-muted px-3 py-2">Tenant-scoped records and constrained workspace visibility</p>
                  <p className="if-panel-muted px-3 py-2">Stateful lifecycle progression with explicit status transitions</p>
                  <p className="if-panel-muted px-3 py-2">Action history for operational and audit inspection</p>
                </div>
              </AnimatedCard>
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section>
            <SectionHeading
              eyebrow="Enterprise Benefits"
              title="Improve operational confidence while reducing delivery friction"
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {enterpriseBenefits.map((benefit) => (
                <AnimatedCard key={benefit}>
                  <p className="text-sm text-brand-textSoft">{benefit}</p>
                </AnimatedCard>
              ))}
            </div>
          </section>
        </FadeInSection>

        <FadeInSection>
          <section className="if-panel p-6 md:p-8">
            <SectionHeading
              eyebrow="Next Step"
              title="See InternFlow in a real operational context"
              subtitle="Book a guided walkthrough of provider operations, learner lifecycle controls, and evidence-ready reporting flows."
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/demo" className="if-btn if-btn-primary px-4 py-2">
                Request Demo
              </Link>
              <Link href="/onboarding/create-org" className="if-btn if-btn-secondary px-4 py-2">
                Register Organization
              </Link>
              <Link href="/pricing" className="if-btn if-btn-secondary px-4 py-2">
                View Pricing
              </Link>
            </div>
          </section>
        </FadeInSection>
      </div>
    </SiteShell>
  );
}
