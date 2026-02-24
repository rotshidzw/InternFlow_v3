import Link from "next/link";
import { MotionLinkButton } from "@/components/motion-link-button";

export function AudienceCTA() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
          For organisations
        </p>
        <h3 className="mt-2 text-xl font-semibold">
          Launch your tenant workspace
        </h3>
        <p className="mt-2 text-sm text-slate-200">
          Create a workspace, programmes, and invite learners.
        </p>
        <div className="mt-4">
          <MotionLinkButton
            href="/onboarding/create-org"
            label="Register Organisation"
            className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 shadow-sm transition-shadow hover:shadow-[0_10px_30px_rgba(16,185,129,0.35)]"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
          For students
        </p>
        <h3 className="mt-2 text-xl font-semibold">Start without waiting</h3>
        <p className="mt-2 text-sm text-slate-200">
          No invite? Build your profile and browse public opportunities.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/onboarding/profile"
            className="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium"
          >
            Create my profile
          </Link>
          <Link
            href="/auth/setup?mode=join"
            className="rounded-xl border border-emerald-300/50 px-4 py-2 text-sm text-emerald-200"
          >
            Join via invite token
          </Link>
        </div>
      </div>
    </div>
  );
}
