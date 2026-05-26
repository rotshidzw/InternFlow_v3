import Link from "next/link";
import { MotionLinkButton } from "@/components/motion-link-button";

export function AudienceCTA() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50/80 p-5 dark:border-emerald-300/30 dark:bg-emerald-500/10">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          For organisations
        </p>
        <h3 className="mt-2 text-xl font-semibold">
          Launch your tenant workspace
        </h3>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          Create a workspace, programmes, and invite learners.
        </p>
        <div className="mt-4">
          <MotionLinkButton
            href="/register-organization"
            label="Register Organisation"
            className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 shadow-sm transition-shadow hover:shadow-[0_10px_30px_rgba(16,185,129,0.35)]"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-5 dark:border-white/20 dark:bg-white/5">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          For students
        </p>
        <h3 className="mt-2 text-xl font-semibold">Start without waiting</h3>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          No invite? Build your profile and browse public opportunities.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/onboarding/profile"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium dark:border-white/30"
          >
            Create my profile
          </Link>
          <Link
            href="/auth/setup?mode=join"
            className="rounded-xl border border-emerald-300/70 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-300/50 dark:text-emerald-200"
          >
            Join via invite token
          </Link>
        </div>
      </div>
    </div>
  );
}

