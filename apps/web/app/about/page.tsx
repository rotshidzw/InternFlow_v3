import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { BrandImagePanel } from "@/components/visual/brand-image-panel";
import { brandImagery } from "@/lib/brand-imagery";

const founderImagePath = "/founder-placeholder.svg";

const principles = [
  "Operational clarity over fragmented administration",
  "Evidence-first workflow design for audit confidence",
  "Role-safe delivery for enterprise governance",
  "Practical systems that scale across organisations",
];

const builtFor = [
  "Providers and tenant administrators running multiple programmes",
  "Coordinators and facilitators managing learner progression",
  "Finance and payroll functions tracking stipend and payment evidence",
  "Auditors and oversight stakeholders requiring traceable controls",
];

export default function AboutPage() {
  return (
    <SiteShell>
      <div className="space-y-12">
        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="if-panel p-6 md:p-8">
            <SectionHeading
              eyebrow="About InternFlow"
              title="A systems company focused on programme operations integrity"
              subtitle="InternFlow exists to help organisations deliver internship and learnership programmes with operational control, evidence quality, and audit readiness."
            />
          </div>
          <BrandImagePanel
            image={brandImagery.trustAndGovernance}
            eyebrow="Enterprise Positioning"
            title="Built for operational trust"
            description="InternFlow combines delivery control with evidence confidence across complex programme environments."
            imageClassName="h-full min-h-[18rem]"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <AnimatedCard>
            <h2 className="text-xl font-semibold text-brand-text">Why InternFlow exists</h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-textSoft">
              Many programme teams operate across disconnected files, ad hoc messaging, and manual
              evidence tracking. This creates lifecycle confusion, weak accountability, and audit
              stress. InternFlow was built to establish one controlled operating layer where teams
              can execute consistently and report with confidence.
            </p>
          </AnimatedCard>
          <AnimatedCard>
            <h2 className="text-xl font-semibold text-brand-text">What problem it solves</h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-textSoft">
              InternFlow reduces operational fragmentation across learner onboarding, documents,
              register evidence, payment records, certificates, follow-up tracking, and close-out
              reporting. Teams gain clearer state management and better evidence lineage across the
              full programme cycle.
            </p>
          </AnimatedCard>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <BrandImagePanel
            image={brandImagery.modernTeam}
            eyebrow="Who We Serve"
            title="Designed for operational teams under real delivery pressure"
            description="The platform is built for organisations that need reliable day-to-day execution and consistent reporting outcomes."
            imageClassName="h-full min-h-[20rem]"
          />
          <div>
            <SectionHeading
              eyebrow="Who It Is Built For"
              title="Organisations delivering real programmes at scale"
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {builtFor.map((item) => (
                <AnimatedCard key={item}>
                  <p className="text-sm text-brand-textSoft">{item}</p>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        <section className="if-panel grid gap-6 p-6 md:grid-cols-[120px_1fr] md:items-center">
          <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
            <img
              src={founderImagePath}
              alt="Founder placeholder"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">Founder</p>
            <h2 className="text-2xl font-semibold text-brand-text">Mavhungu Rotshidzwa Chester</h2>
            <p className="text-sm text-brand-muted">Developer - Systems Support - AI Engineer</p>
            <p className="text-sm leading-relaxed text-brand-textSoft">
              Chester founded InternFlow to solve practical operational and audit challenges in
              training, learnership, internship, and skills development programmes. The platform
              vision is straightforward: give teams a reliable enterprise system for execution,
              governance, and evidence confidence.
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionHeading
              eyebrow="Operating Principles"
              title="How InternFlow approaches enterprise workflow software"
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {principles.map((principle) => (
                <AnimatedCard key={principle}>
                  <p className="text-sm text-brand-textSoft">{principle}</p>
                </AnimatedCard>
              ))}
            </div>
          </div>
          <BrandImagePanel
            image={brandImagery.complianceEvidence}
            eyebrow="Evidence Culture"
            title="Execution quality should always be visible"
            description="InternFlow promotes measurable process discipline from learner onboarding to close-out." 
            imageClassName="h-full min-h-[18rem]"
          />
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Platform Vision"
            title="Build trust through operational precision"
            subtitle="InternFlow will continue evolving as a serious enterprise platform for teams that need strong control over programme delivery, reporting, and governance."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact?intent=demo" className="if-btn if-btn-primary px-4 py-2">
              Contact for Demo
            </Link>
            <Link href="/onboarding/create-org" className="if-btn if-btn-secondary px-4 py-2">
              Register Organization
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

