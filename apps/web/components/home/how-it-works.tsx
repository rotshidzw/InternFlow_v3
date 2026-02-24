import { AnimatedCard } from "@/components/animated-card";

const steps = [
  "Organisation creates workspace and programmes.",
  "Learners onboard with guided checklist and document validation.",
  "Coordinators track compliance and export audit-ready reports.",
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
        How it works
      </p>
      <h2 className="text-3xl font-semibold">
        Pilot-ready workflow in three steps
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <AnimatedCard key={step}>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Step {index + 1}
            </p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-100">
              {step}
            </p>
          </AnimatedCard>
        ))}
      </div>
    </section>
  );
}
