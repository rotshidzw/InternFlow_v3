"use client";

import { useState } from "react";

export default function OrgLoginPage({ params }: { params: { orgSlug: string } }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function sendOtp() {
    setStatus("Sending OTP...");
    const res = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setStatus(res.ok ? "OTP sent. Check your inbox/MailHog." : "Failed to send OTP.");
  }

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Login to {params.orgSlug}</h1>
      <p className="mt-1 text-sm text-slate-600">Use your organization email. If your account has one tenant membership, you will be auto-routed to your workspace.</p>
      <div className="mt-4 space-y-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@organization.co.za" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        <button onClick={sendOtp} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Send OTP</button>
        <p className="text-sm text-slate-600">{status}</p>
      </div>
    </div>
  );
}
