import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">Welcome to InternFlow onboarding</h1>
      <p className="mt-2 text-slate-200">Create a new organisation workspace or join one using an invite token.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/onboarding/create-org" className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950">Create Organisation</Link>
        <Link href="/auth/setup" className="rounded-xl border border-white/30 px-4 py-2">Join via Invite</Link>
      </div>
    </div>
  );
}
