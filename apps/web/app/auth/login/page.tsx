"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpRequestSchema } from "@internflow/shared/src/schemas";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";

const emailSchema = otpRequestSchema;
const otpSchema = z.object({
  code: z.string().length(6, "OTP must be exactly 6 digits"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

const demoUsers = [
  { label: "Demo Student", email: "student@demo.com" },
  { label: "Demo Coordinator", email: "coordinator@demo.com" },
  { label: "Demo Provider Admin", email: "provider@demo.com" },
  { label: "Demo Platform Admin", email: "admin@internflow.com" },
];
const demoLoginEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });
  const prefilledEmail = searchParams.get("email")?.toLowerCase() ?? "";
  const fromSignup = searchParams.get("from") === "signup";

  useEffect(() => {
    if (!prefilledEmail) return;
    emailForm.setValue("email", prefilledEmail);
  }, [emailForm, prefilledEmail]);

  const requestOtp = async (values: EmailFormValues) => {
    setError(null);
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      setError("We could not send the OTP. Please retry.");
      return;
    }

    setEmail(values.email.toLowerCase());
    setStep("verify");
  };

  const loginDemoUser = async (email: string) => {
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = await res.json();
    if (payload.ok) router.push(payload.redirectTo);
  };

  const verifySubmittedOtp = async (values: OtpFormValues) => {
    setError(null);
    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: values.code }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setError(
        payload.error === "expired"
          ? "OTP expired. Request a new one."
          : "Invalid OTP. Try again.",
      );
      return;
    }

    router.push(payload.redirectTo);
  };

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <div className="if-panel grid overflow-hidden rounded-3xl md:grid-cols-[1fr_1.2fr]">
        <section className="border-b border-brand-border/70 bg-[#090d21]/92 p-6 md:border-b-0 md:border-r md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">Secure sign-in</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-text">Sign In to InternFlow</h1>
          <p className="mt-3 text-sm text-brand-textSoft">
            Existing users sign in here using one-time passcode verification and role-aware routing.
          </p>
          <div className="if-panel-muted mt-6 p-4">
            <p className="text-sm font-semibold text-brand-text">Workspace routing</p>
            <ul className="mt-2 space-y-1 text-xs text-brand-muted">
              <li>Tenant users route to organisation or student portals</li>
              <li>Platform users route to HQ operations console</li>
              <li>OTP events remain local-dev friendly via MailHog</li>
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="if-btn if-btn-secondary px-3 py-1.5 text-xs"
            >
              Back to Home
            </button>
            <Link href="/student-sign-up" className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Student Sign Up
            </Link>
            <Link href="/register-organization" className="if-btn if-btn-secondary px-3 py-1.5 text-xs">
              Register Organization
            </Link>
          </div>
        </section>

        <section className="bg-[#070b18]/88 p-6 md:p-8">
          {fromSignup ? (
            <p className="if-status-success mb-4 rounded-lg border p-3 text-sm">
              Account created. Complete sign-in verification to continue onboarding.
            </p>
          ) : null}
          {step === "request" ? (
            <form
              onSubmit={emailForm.handleSubmit(requestOtp)}
              className="space-y-4"
            >
              <label className="block text-sm text-brand-textSoft">Email address</label>
              <input
                {...emailForm.register("email")}
                placeholder="student@demo.com"
                className="w-full px-4 py-3"
              />
              <button
                disabled={emailForm.formState.isSubmitting}
                className="if-btn if-btn-primary w-full py-3 disabled:opacity-50"
              >
                Send Sign-In OTP
              </button>
            </form>
          ) : (
            <form
              onSubmit={otpForm.handleSubmit(verifySubmittedOtp)}
              className="space-y-4"
            >
              <p className="text-sm text-brand-textSoft">
                OTP sent to <span className="font-semibold text-brand-text">{email}</span>. Check
                MailHog at <span className="text-brand-accentStrong">http://localhost:8025</span>.
              </p>
              <label className="block text-sm text-brand-textSoft">Enter 6-digit code</label>
              <input
                {...otpForm.register("code")}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="w-full px-4 py-3"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="if-btn if-btn-secondary w-full py-3"
                >
                  Change email
                </button>
                <button
                  disabled={otpForm.formState.isSubmitting}
                  className="if-btn if-btn-primary w-full py-3 disabled:opacity-50"
                >
                  Verify OTP
                </button>
              </div>
            </form>
          )}

          {demoLoginEnabled ? (
            <div className="if-panel-muted mt-6 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-brand-accentStrong">Demo Sign In</h2>
              <p className="mt-1 text-xs text-brand-muted">
                Use demo accounts. OTP appears in MailHog at http://localhost:8025.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => loginDemoUser(u.email)}
                    className="rounded-lg border border-brand-border px-3 py-2 text-left text-sm transition hover:border-brand-accent hover:bg-brand-surface"
                  >
                    <span className="font-medium text-brand-text">{u.label}</span>
                    <span className="block text-xs text-brand-muted">{u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-brand-muted">
            New student?{" "}
            <Link href="/student-sign-up" className="text-brand-accentStrong hover:text-brand-text">
              Start Student Sign Up
            </Link>
            . Need organisation access?{" "}
            <Link href="/register-organization" className="text-brand-accentStrong hover:text-brand-text">
              Register Organization
            </Link>
            .
          </p>

          {error && (
            <p className="if-status-error mt-4 rounded-lg border p-3 text-sm">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
