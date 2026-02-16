import { SiteShell } from "@/components/site-shell";
import { AnimatedCard } from "@/components/animated-card";

const plans = [
  { name: "Starter", price: "R0 demo", note: "For evaluation and pilot workflows." },
  { name: "Growth", price: "Contact sales", note: "For organisations running multiple cohorts." },
  { name: "Enterprise", price: "Custom", note: "Advanced governance, integrations, and support." }
];

export default function PricingPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold">Pricing</h1>
        <p className="text-slate-200">Choose a plan that matches your organisation size. Start with a demo and scale to full operational delivery.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <AnimatedCard key={plan.name}>
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-2xl font-bold text-emerald-300">{plan.price}</p>
              <p className="mt-3 text-sm text-slate-200">{plan.note}</p>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
