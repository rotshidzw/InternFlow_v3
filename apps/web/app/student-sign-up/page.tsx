"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "signup" | "verify";

export default function StudentSignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    const response = await fetch("/api/auth/student-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok || !payload?.ok) {
      setError(payload?.error ?? "We could not create your account right now.");
      return;
    }

    setInfo("Account created. We sent a one-time code to your email.");
    setStep("verify");
  };

  const submitOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), code }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok || !payload?.ok) {
      setError(
        payload?.error === "expired"
          ? "OTP expired. Request a new sign-up code."
          : "Invalid OTP. Please try again.",
      );
      return;
    }

    router.push(payload.redirectTo ?? "/onboarding/profile");
  };

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <div className="if-panel grid overflow-hidden rounded-3xl md:grid-cols-[1fr_1.2fr]">
        <section className="border-b border-brand-border/70 bg-[#090d21]/92 p-6 md:border-b-0 md:border-r md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">Student onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-text">Student Sign Up</h1>
          <p className="mt-3 text-sm text-brand-textSoft">
            Create your student account first, then continue into onboarding and programme application steps.
          </p>
          <div className="if-panel-muted mt-6 p-4">
            <p className="text-sm font-semibold text-brand-text">Student journey</p>
            <ul className="mt-2 space-y-1 text-xs text-brand-muted">
              <li>Sign Up</li>
              <li>Verify and Sign In</li>
              <li>Complete profile</li>
              <li>Apply and upload required documents</li>
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/auth/login" className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Existing user? Sign In
            </Link>
            <Link href="/register-organization" className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Register Organization
            </Link>
            <Link href="/contact?intent=demo" className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Request Demo
            </Link>
          </div>
        </section>

        <section className="bg-[#070b18]/88 p-6 md:p-8">
          {step === "signup" ? (
            <form onSubmit={submitSignup} className="space-y-4">
              <label className="block text-sm text-brand-textSoft">Full name</label>
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3"
              />
              <label className="block text-sm text-brand-textSoft">Email address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3"
              />
              <button
                disabled={busy}
                className="if-btn if-btn-primary w-full py-3 disabled:opacity-60"
              >
                {busy ? "Creating account..." : "Create Student Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitOtp} className="space-y-4">
              <p className="text-sm text-brand-textSoft">
                We sent an OTP to <span className="font-semibold text-brand-text">{email.toLowerCase()}</span>.
                Verify to sign in and continue onboarding.
              </p>
              <label className="block text-sm text-brand-textSoft">Enter 6-digit code</label>
              <input
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="w-full px-4 py-3"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("signup")}
                  className="if-btn if-btn-secondary w-full py-3"
                >
                  Edit details
                </button>
                <button
                  disabled={busy}
                  className="if-btn if-btn-primary w-full py-3 disabled:opacity-60"
                >
                  {busy ? "Verifying..." : "Verify and Continue"}
                </button>
              </div>
            </form>
          )}

          {info ? (
            <p className="if-status-success mt-4 rounded-lg border p-3 text-sm">
              {info}
            </p>
          ) : null}
          {error ? (
            <p className="if-status-error mt-4 rounded-lg border p-3 text-sm">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
