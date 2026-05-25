import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="if-panel mx-auto mt-10 max-w-3xl rounded-3xl p-8">
      <h1 className="text-3xl font-semibold">Welcome to InternFlow onboarding</h1>
      <p className="mt-2 text-brand-textSoft">Create a new organisation workspace or join one using an invite token.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/onboarding/create-org" className="if-btn if-btn-primary px-4 py-2">Create Organisation</Link>
        <Link href="/auth/setup" className="if-btn if-btn-secondary px-4 py-2">Join via Invite</Link>
      </div>
    </div>
  );
}
