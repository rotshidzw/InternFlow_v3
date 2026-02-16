import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";

export default function AboutPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold">About InternFlow</h1>
        <p className="max-w-3xl text-slate-200">InternFlow is a multi-organisation platform that helps companies run internship and learnership programs end-to-end: onboarding, applications, documentation, approvals, and compliance reporting.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatedCard>
            <h2 className="text-xl font-semibold">Who uses it</h2>
            <p className="mt-2 text-sm text-slate-200">Organisation admins, coordinators, supervisors, providers, and students each get purpose-built experiences.</p>
          </AnimatedCard>
          <AnimatedCard>
            <h2 className="text-xl font-semibold">What it solves</h2>
            <p className="mt-2 text-sm text-slate-200">Reduces manual follow-up, keeps records audit-ready, and gives clear visibility on accepted/rejected applications and active cohorts.</p>
          </AnimatedCard>
        </div>
      </div>
    </SiteShell>
  );
}
