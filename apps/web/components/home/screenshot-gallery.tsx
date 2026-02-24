import Image from "next/image";
import { AnimatedCard } from "@/components/animated-card";

const screens = [
  {
    src: "/screens/learner-dashboard.png",
    title: "Learner dashboard",
    caption: "Students track progress, tasks, and applications in one view.",
  },
  {
    src: "/screens/document-vault.png",
    title: "Document vault",
    caption: "Compliance documents with statuses and verification context.",
  },
  {
    src: "/screens/logbook-approvals.png",
    title: "Logbook approvals",
    caption: "Supervisors review submissions with clear approval state.",
  },
  {
    src: "/screens/coordinator-dashboard.png",
    title: "Coordinator dashboard",
    caption: "Operational KPIs and workflow bottlenecks at a glance.",
  },
];

export function ScreenshotGallery() {
  return (
    <section id="inside" className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
        Inside InternFlow
      </p>
      <h2 className="text-3xl font-semibold">A quick view of real workflows</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {screens.map((screen) => (
          <AnimatedCard key={screen.src}>
            <div className="overflow-hidden rounded-xl border border-white/15">
              <Image
                src={screen.src}
                alt={screen.title}
                width={1200}
                height={700}
                loading="lazy"
                className="h-auto w-full object-cover"
              />
            </div>
            <p className="mt-3 text-sm font-medium">{screen.title}</p>
            <p className="mt-1 text-xs text-slate-300">{screen.caption}</p>
          </AnimatedCard>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Demo data shown. Real workflows in pilot.
      </p>
    </section>
  );
}
