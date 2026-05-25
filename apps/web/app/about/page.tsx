import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";

const founderImagePath = "/founder-placeholder.svg";

export default function AboutPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold text-brand-text">About InternFlow</h1>
        <p className="max-w-3xl text-brand-textSoft">
          InternFlow is a multi-organisation platform that helps teams run internship and
          learnership programmes end-to-end: onboarding, applications, documentation, approvals,
          and compliance reporting.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatedCard>
            <h2 className="text-xl font-semibold text-brand-text">Who uses it</h2>
            <p className="mt-2 text-sm text-brand-textSoft">
              Organisation admins, coordinators, supervisors, providers, and students each get
              purpose-built operational views.
            </p>
          </AnimatedCard>
          <AnimatedCard>
            <h2 className="text-xl font-semibold text-brand-text">What it solves</h2>
            <p className="mt-2 text-sm text-brand-textSoft">
              Reduces manual follow-up, keeps records audit-ready, and gives clear visibility on
              application outcomes and active cohorts.
            </p>
          </AnimatedCard>
        </div>
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
              Chester founded InternFlow to solve practical operations and audit challenges in
              training, learnership, internship, and skills development programmes. The platform is
              built for teams that need reliable systems control, workflow visibility, and
              enterprise-grade evidence readiness.
            </p>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
