"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpRequestSchema } from "@internflow/shared/src/schemas";
import { z } from "zod";
import { useRouter } from "next/navigation";

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

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="if-panel w-full max-w-xl rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">
            Secure access
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="if-btn if-btn-secondary px-3 py-1.5 text-xs"
          >
            Back to Home
          </button>
        </div>
        <h1 className="mt-2 text-3xl font-semibold">
          Sign in with one-time passcode
        </h1>
        <p className="mt-2 text-sm text-brand-textSoft">
          Organisation teams and students log in here. If you are new, you can
          continue to organisation setup after verification.
        </p>

        {step === "request" ? (
          <form
            onSubmit={emailForm.handleSubmit(requestOtp)}
            className="mt-6 space-y-4"
          >
            <label className="block text-sm text-brand-textSoft">
              Email address
            </label>
            <input
              {...emailForm.register("email")}
              placeholder="student@demo.com"
              className="w-full px-4 py-3"
            />
            <button
              disabled={emailForm.formState.isSubmitting}
              className="if-btn if-btn-primary w-full py-3 disabled:opacity-50"
            >
              Send OTP
            </button>
          </form>
        ) : (
          <form
            onSubmit={otpForm.handleSubmit(verifySubmittedOtp)}
            className="mt-6 space-y-4"
          >
            <p className="text-sm text-brand-textSoft">
              OTP sent to{" "}
              <span className="font-semibold text-brand-text">
                {email}
              </span>
              . Check MailHog at{" "}
              <span className="text-brand-accentStrong">
                http://localhost:8025
              </span>
              .
            </p>
            <label className="block text-sm text-brand-textSoft">
              Enter 6-digit code
            </label>
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

        <div className="if-panel-muted mt-6 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-brand-accentStrong">
            Demo Login
          </h2>
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
                <span className="block text-xs text-brand-muted">
                  {u.email}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="if-status-error mt-4 rounded-lg border p-3 text-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
