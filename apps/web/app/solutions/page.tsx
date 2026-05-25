import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { SectionHeading } from "@/components/marketing/section-heading";

const solutions = [
  {
    title: "Provider and Tenant Operations",
    points: [
      "Control programme setup, intake readiness, and monthly delivery management.",
      "Track evidence quality across documents, registers, and approvals.",
      "Coordinate teams from one operational workspace.",
    ],
  },
  {
    title: "Coordinator and Facilitation Teams",
    points: [
      "Manage learner progression from application through completion.",
      "Monitor attendance, checklist actions, and support escalations.",
      "Reduce manual status chasing with clear lifecycle visibility.",
    ],
  },
  {
    title: "Finance and Payroll Functions",
    points: [
      "Track stipend eligibility, payment periods, and exception reasons.",
      "Link payslips and proof records for monthly evidence consistency.",
      "Improve financial traceability for reporting cycles.",
    ],
  },
  {
    title: "Audit and Oversight Stakeholders",
    points: [
      "Inspect role-scoped activity history without disrupting operations.",
      "Validate control posture across evidence domains.",
      "Review close-out readiness with structured outputs.",
    ],
  },
];

export default function SolutionsPage() {
  return (
    <SiteShell>
      <div className="space-y-12">
        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Solutions"
            title="Role-specific operational solutions for programme delivery"
            subtitle="InternFlow supports the full enterprise delivery chain: provider governance, coordinator execution, finance evidence, and audit visibility."
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {solutions.map((solution) => (
            <AnimatedCard key={solution.title}>
              <h2 className="text-xl font-semibold text-brand-text">{solution.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-brand-textSoft">
                {solution.points.map((point) => (
                  <li key={point} className="if-panel-muted rounded-lg px-3 py-2">
                    {point}
                  </li>
                ))}
              </ul>
            </AnimatedCard>
          ))}
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Need a tailored walkthrough?"
            title="Map InternFlow to your operating model"
            subtitle="See how role-based controls align to your specific delivery structure, evidence obligations, and reporting expectations."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/demo" className="if-btn if-btn-primary px-4 py-2">
              Request Demo
            </Link>
            <Link href="/pricing" className="if-btn if-btn-secondary px-4 py-2">
              View Pricing
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
