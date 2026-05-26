import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { BrandImagePanel } from "@/components/visual/brand-image-panel";
import { brandImagery } from "@/lib/brand-imagery";

const plans = [
  {
    name: "Starter",
    price: "R0 demo",
    summary: "Evaluation and pilot workflows",
    details: [
      "Demo-friendly environment for stakeholder alignment",
      "Core operational flow visibility",
      "Initial fit assessment for programme teams",
    ],
  },
  {
    name: "Growth",
    price: "Contact sales",
    summary: "For active programme operations",
    details: [
      "Multi-role delivery controls for real monthly operations",
      "Structured evidence, registers, and reporting rhythm",
      "Operational support for programme expansion",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    summary: "For complex governance and scale",
    details: [
      "Advanced governance posture for multi-tenant operations",
      "Implementation planning and enterprise change support",
      "Tailored operating model alignment and oversight controls",
    ],
  },
];

const capabilityBands = [
  "Learner lifecycle and progression controls",
  "Document and evidence integrity workflows",
  "Attendance, stipend, and operational cost capture",
  "Certificate and follow-up management",
  "Audit-ready reporting and close-out evidence",
];

export default function PricingPage() {
  return (
    <SiteShell>
      <div className="space-y-12">
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="if-panel p-6 md:p-8">
            <SectionHeading
              eyebrow="Pricing"
              title="Commercial models for serious delivery teams"
              subtitle="Start with demonstration and evaluation, then scale into production operations with a package aligned to your governance and delivery context."
            />
          </div>
          <BrandImagePanel
            image={brandImagery.providerControlRoom}
            eyebrow="Commercial Alignment"
            title="Pricing built around operational complexity"
            description="Engagement models are designed for practical rollout, governance confidence, and delivery maturity."
            imageClassName="h-full min-h-[18rem]"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <AnimatedCard key={plan.name}>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-accentStrong">
                {index === 1 ? "Recommended" : "Plan"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-brand-text">{plan.name}</h2>
              <p className="mt-1 text-lg font-semibold text-brand-accentStrong">{plan.price}</p>
              <p className="mt-2 text-sm text-brand-textSoft">{plan.summary}</p>
              <ul className="mt-4 space-y-2 text-sm text-brand-muted">
                {plan.details.map((detail) => (
                  <li key={detail} className="if-panel-muted rounded-lg px-3 py-2">
                    {detail}
                  </li>
                ))}
              </ul>
            </AnimatedCard>
          ))}
        </section>

        <section>
          <SectionHeading
            eyebrow="Capability Coverage"
            title="What platform capability is included across pricing conversations"
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilityBands.map((capability) => (
              <AnimatedCard key={capability}>
                <p className="text-sm text-brand-textSoft">{capability}</p>
              </AnimatedCard>
            ))}
          </div>
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Engagement"
            title="Plan your rollout with an enterprise implementation path"
            subtitle="InternFlow engagements are designed around operational reality: existing delivery constraints, governance expectations, and evidence outcomes."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact?intent=demo" className="if-btn if-btn-primary px-4 py-2">
              Contact for Demo
            </Link>
            <Link href="/about" className="if-btn if-btn-secondary px-4 py-2">
              About InternFlow
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

