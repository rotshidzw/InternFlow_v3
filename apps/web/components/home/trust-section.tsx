import { AnimatedCard } from "@/components/animated-card";

const trustItems = [
  "POPIA-aware data handling",
  "Role-based access control (RBAC)",
  "Audit trail & activity timeline",
  "Secure document storage + version history",
];

export function TrustSection() {
  return (
    <section id="trust" className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
        Trust & Security
      </p>
      <h2 className="text-3xl font-semibold">
        Compliance posture built into operations
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((item) => (
          <AnimatedCard key={item}>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {item}
            </p>
          </AnimatedCard>
        ))}
      </div>
    </section>
  );
}
