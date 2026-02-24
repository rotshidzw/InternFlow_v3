"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpRequestSchema } from "@internflow/shared/src/schemas";
import { z } from "zod";
import { useRouter } from "next/navigation";

const emailSchema = otpRequestSchema;
const otpSchema = z.object({ code: z.string().length(6, "OTP must be exactly 6 digits") });

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

const demoUsers = [
  { label: "Demo Student", email: "student@demo.com" },
  { label: "Demo Coordinator", email: "coordinator@demo.com" },
  { label: "Demo Provider Admin", email: "provider@demo.com" },
  { label: "Demo Platform Admin", email: "admin@internflow.com" }
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const requestOtp = async (values: EmailFormValues) => {
    setError(null);
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      setError("We could not send the OTP. Please retry.");
      return;
    }

    setEmail(values.email.toLowerCase());
    setStep("verify");
  };

  const loginDemoUser = async (email: string) => {
    const res = await fetch("/api/auth/demo-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const payload = await res.json();
    if (payload.ok) router.push(payload.redirectTo);
  };

  const verifySubmittedOtp = async (values: OtpFormValues) => {
    setError(null);
    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: values.code })
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setError(payload.error === "expired" ? "OTP expired. Request a new one." : "Invalid OTP. Try again.");
      return;
    }

    router.push(payload.redirectTo);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Secure access</p>
        <button type="button" onClick={() => router.push("/")} className="inline-flex rounded-xl border border-white/20 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10">
          Back to Home
        </button>
      </div>
      <h1 className="mt-2 text-3xl font-semibold text-white">Sign in with one-time passcode</h1>
      <p className="mt-2 text-sm text-slate-200">Organisation teams and students log in here. If you are new, you can continue to organisation setup after verification.</p>

      {step === "request" ? (
        <form onSubmit={emailForm.handleSubmit(requestOtp)} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-200">Email address</label>
          <input {...emailForm.register("email")} placeholder="student@demo.com" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-4 py-3 text-white outline-none ring-emerald-400 placeholder:text-slate-400 focus:ring-2" />
          <button disabled={emailForm.formState.isSubmitting} className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50">Send OTP</button>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(verifySubmittedOtp)} className="mt-6 space-y-4">
          <p className="text-sm text-slate-200">OTP sent to <span className="font-semibold text-white">{email}</span>. Check MailHog at <span className="text-emerald-300">http://localhost:8025</span>.</p>
          <label className="block text-sm text-slate-200">Enter 6-digit code</label>
          <input {...otpForm.register("code")} inputMode="numeric" maxLength={6} placeholder="123456" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-4 py-3 text-white outline-none ring-emerald-400 placeholder:text-slate-400 focus:ring-2" />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("request")} className="w-full rounded-xl border border-white/20 py-3 text-slate-100">Change email</button>
            <button disabled={otpForm.formState.isSubmitting} className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50">Verify OTP</button>
          </div>
        </form>
      )}

      <div className="mt-6 rounded-2xl border border-white/20 bg-slate-950/30 p-4">
        <h2 className="text-sm font-semibold text-emerald-300">Demo Login</h2>
        <p className="mt-1 text-xs text-slate-300">Use demo accounts. OTP appears in MailHog at http://localhost:8025.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {demoUsers.map((u) => (
            <button key={u.email} type="button" onClick={() => loginDemoUser(u.email)} className="rounded-lg border border-white/20 px-3 py-2 text-left text-sm hover:bg-white/10">
              <span className="font-medium">{u.label}</span>
              <span className="block text-xs text-slate-300">{u.email}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      </div>
    </div>
  );
}
