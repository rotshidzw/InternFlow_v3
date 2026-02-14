import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";

const modules = ["Onboarding", "Documents", "Logbook", "Payslips", "Certificates", "Support Tickets"];

export default function HomePage() {
  return (
    <SiteShell>
      <div className="space-y-8">
        <section className="grid items-center gap-6 md:grid-cols-2">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Internship + Learnership Platform</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Run compliant student programs across providers, employers, and coordinators.</h1>
            <p className="text-slate-200">InternFlow gives each stakeholder a guided portal while coordinators keep one live compliance view across multiple organisations.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950">Try Demo</Link>
              <Link href="/app/student" className="rounded-xl border border-white/30 px-4 py-2">Student Demo</Link>
              <Link href="/app/provider" className="rounded-xl border border-white/30 px-4 py-2">Provider Demo</Link>
              <Link href="/app/coordinator" className="rounded-xl border border-white/30 px-4 py-2">Coordinator Demo</Link>
            </div>
          </div>
          <AnimatedCard>
            <h2 className="mb-3 text-xl font-semibold">How it works</h2>
            <ol className="space-y-3 text-sm text-slate-100">
              <li><span className="font-semibold text-emerald-300">Student:</span> applies, uploads required evidence, tracks task progress.</li>
              <li><span className="font-semibold text-emerald-300">Provider:</span> reviews submissions, mentors, verifies activity and outcomes.</li>
              <li><span className="font-semibold text-emerald-300">Coordinator:</span> monitors compliance, approvals, and cross-company reporting.</li>
            </ol>
          </AnimatedCard>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <AnimatedCard key={module}>
              <h3 className="text-lg font-semibold">{module}</h3>
              <p className="mt-2 text-sm text-slate-200">Operational workflows, statuses, and evidence tracking designed for real programs.</p>
            </AnimatedCard>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <AnimatedCard>
            <h3 className="text-xl font-semibold">Features</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-200">
              <li>Role-based portals for students, providers, supervisors, and coordinators.</li>
              <li>Automated OTP login, upload workflows, and approvals.</li>
              <li>Audit-ready timelines and document version history.</li>
            </ul>
          </AnimatedCard>
          <AnimatedCard>
            <h3 className="text-xl font-semibold">Compliance + Security</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-200">
              <li>POPIA-aware access controls and event audit logs.</li>
              <li>Encrypted object storage using MinIO-compatible backends.</li>
              <li>Roadmap: e-signing, SLAs, and provider performance analytics.</li>
            </ul>
          </AnimatedCard>
        </section>

        <AnimatedCard>
          <h3 className="text-xl font-semibold">Multi-Organisation</h3>
          <p className="mt-2 text-sm text-slate-200">Each company operates in its own tenant with isolated users, documents, and progress data while coordinators can view rolled-up oversight where permitted.</p>
        </AnimatedCard>
      </div>
    </SiteShell>
  );
}
