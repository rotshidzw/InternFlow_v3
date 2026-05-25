import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { SectionHeading } from "@/components/marketing/section-heading";

const controlDomains = [
  {
    title: "Tenant Isolation",
    detail:
      "Organisation workspaces are separated by tenant context to protect operational boundaries and visibility rules.",
  },
  {
    title: "Role-Scoped Access",
    detail:
      "Role grouping and access controls limit sensitive actions to authorised functions across provider operations.",
  },
  {
    title: "Lifecycle Integrity",
    detail:
      "Status progression is managed with explicit transitions to reduce ambiguous workflow states and control drift.",
  },
  {
    title: "Evidence Traceability",
    detail:
      "Documents, registers, payments, certificates, and follow-up outcomes are tracked with audit-relevant event history.",
  },
  {
    title: "Operational Monitoring",
    detail:
      "Teams can inspect monthly readiness signals and evidence posture using structured dashboard and reporting views.",
  },
  {
    title: "Close-Out Readiness",
    detail:
      "Export and reporting paths support programme closure processes where evidence quality and consistency matter.",
  },
];

export default function SecurityPage() {
  return (
    <SiteShell>
      <div className="space-y-12">
        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Security and Compliance"
            title="Enterprise control posture for operational software"
            subtitle="InternFlow is designed around secure operational boundaries, role-safe execution, and evidence continuity across programme workflows."
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {controlDomains.map((domain) => (
            <AnimatedCard key={domain.title}>
              <h2 className="text-lg font-semibold text-brand-text">{domain.title}</h2>
              <p className="mt-2 text-sm text-brand-textSoft">{domain.detail}</p>
            </AnimatedCard>
          ))}
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Governance Positioning"
            title="Built for operational trust"
            subtitle="InternFlow supports teams that require disciplined workflows, evidence-aware delivery, and confident audit preparation in enterprise environments."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/about" className="if-btn if-btn-secondary px-4 py-2">
              About InternFlow
            </Link>
            <Link href="/demo" className="if-btn if-btn-primary px-4 py-2">
              Request Demo
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
