import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { BrandImagePanel } from "@/components/visual/brand-image-panel";
import { brandImagery } from "@/lib/brand-imagery";

const steps = [
  {
    step: "01",
    title: "Tenant Setup and Governance",
    description:
      "Create a controlled organisation workspace with role access, programme structure, and operational settings.",
  },
  {
    step: "02",
    title: "Learner Intake and Validation",
    description:
      "Capture profile data, enforce required document plans, and establish application workflow readiness.",
  },
  {
    step: "03",
    title: "Delivery Operations",
    description:
      "Run attendance registers, progression checkpoints, support interactions, and monthly operational updates.",
  },
  {
    step: "04",
    title: "Payments and Cost Evidence",
    description:
      "Track stipend states, payment proof, payslips, and delivery cost records in structured operational views.",
  },
  {
    step: "05",
    title: "Completion and Certificates",
    description:
      "Manage completion transitions, certificate release logic, and post-training follow-up schedules.",
  },
  {
    step: "06",
    title: "Close-Out and Audit Review",
    description:
      "Generate reporting outputs with linked evidence posture for oversight, governance, and close-out cycles.",
  },
];

export default function HowItWorksPage() {
  return (
    <SiteShell>
      <div className="space-y-12">
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="if-panel p-6 md:p-8">
            <SectionHeading
              eyebrow="How It Works"
              title="A structured delivery flow for enterprise programme operations"
              subtitle="InternFlow aligns operational execution from onboarding through close-out with consistent state progression and evidence controls."
            />
          </div>
          <BrandImagePanel
            image={brandImagery.providerControlRoom}
            eyebrow="Operational Flow"
            title="Designed for repeatable execution"
            description="Each stage of programme delivery maps to explicit controls, responsibilities, and evidence checkpoints."
            imageClassName="h-full min-h-[18rem]"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <AnimatedCard key={step.step}>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">Step {step.step}</p>
              <h2 className="mt-2 text-lg font-semibold text-brand-text">{step.title}</h2>
              <p className="mt-2 text-sm text-brand-textSoft">{step.description}</p>
            </AnimatedCard>
          ))}
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Implementation"
            title="Deploy with operational confidence"
            subtitle="InternFlow is designed for practical rollout with delivery teams who need reliability, accountability, and audit-grade evidence continuity."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact?intent=demo" className="if-btn if-btn-primary px-4 py-2">
              Contact for Demo
            </Link>
            <Link href="/solutions" className="if-btn if-btn-secondary px-4 py-2">
              Explore Solutions
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

