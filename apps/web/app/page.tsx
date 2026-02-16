import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";

const modules = [
  { title: "Onboarding", description: "Role-based onboarding journeys for each organisation's students and staff." },
  { title: "Applications", description: "Track submitted, review, accepted, and rejected applicants per organisation." },
  { title: "Documents", description: "Upload to secure object storage with version history and verification statuses." },
  { title: "Logbook", description: "Weekly submissions, supervisor approvals, and coordinator oversight." },
  { title: "Payments", description: "Payslip and stipend tracking with searchable records." },
  { title: "Support", description: "Support tickets and operational alerts with SLA-ready workflows." }
];

export default function HomePage() {
  return (
    <SiteShell>
      <div className="space-y-10">
        <section id="product" className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">InternFlow platform</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Multi-organisation internship operations, built for real program delivery.</h1>
            <p className="text-slate-200">Organisations first register with InternFlow, get their own isolated workspace, then manage student applications, approvals, and compliance from one polished platform.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950">Try Demo</Link>
              <Link href="/auth" className="rounded-xl border border-white/30 px-4 py-2 text-white">Login</Link>
              <Link href="/onboarding/create-org" className="rounded-xl border border-emerald-300/50 px-4 py-2 text-emerald-200">Register Organization</Link>
            </div>
          </div>
          <AnimatedCard>
            <h2 className="text-xl font-semibold">Platform flow</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-100">
              <li><span className="font-semibold text-emerald-300">1. Organisation onboarding:</span> company creates account and workspace.</li>
              <li><span className="font-semibold text-emerald-300">2. Program setup:</span> organisation configures opportunities and requirements.</li>
              <li><span className="font-semibold text-emerald-300">3. Student lifecycle:</span> apply → review → accepted/rejected → ongoing tracking.</li>
            </ol>
          </AnimatedCard>
        </section>

        <section id="how" className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <AnimatedCard key={module.title}>
              <h3 className="text-lg font-semibold">{module.title}</h3>
              <p className="mt-2 text-sm text-slate-200">{module.description}</p>
            </AnimatedCard>
          ))}
        </section>

        <section id="security" className="grid gap-4 md:grid-cols-2">
          <AnimatedCard>
            <h3 className="text-xl font-semibold">Tenant isolation by design</h3>
            <p className="mt-2 text-sm text-slate-200">Every organisation operates in its own data boundary. Teams manage their own users, programs, and student records without cross-tenant leakage.</p>
          </AnimatedCard>
          <AnimatedCard>
            <h3 className="text-xl font-semibold">Compliance + POPIA posture</h3>
            <p className="mt-2 text-sm text-slate-200">Auditable events, role-scoped access, secure object storage, and export-ready reporting are built into daily workflows.</p>
          </AnimatedCard>
        </section>
      </div>
    </SiteShell>
  );
}
