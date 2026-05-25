import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";

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
          <AnimatedCard>
            <h2 className="text-xl font-semibold text-brand-text">Founder</h2>
            <p className="mt-2 text-sm text-brand-textSoft">
              Mavhungu Rotshidzwa Chester
            </p>
            <p className="text-xs text-brand-muted">Developer • Systems Support • Problem Solver</p>
          </AnimatedCard>
        </div>
      </div>
    </SiteShell>
  );
}
