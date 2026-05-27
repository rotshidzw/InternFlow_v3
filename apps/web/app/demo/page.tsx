"use client";

import { useState } from "react";
import Link from "next/link";

const roleContent: Record<string, string[]> = {
  STUDENT: ["View applications", "Track onboarding checklist", "Upload documents", "Submit logbooks"],
  COORDINATOR: ["Review cohort progress", "Approve logbooks", "Track compliance gaps"],
  PROVIDER_ADMIN: ["Publish opportunities", "Manage org profile", "Invite coordinators"],
  SUPERVISOR: ["Review learner activity", "Approve weekly evidence"]
};

export default function DemoPage() {
  const [role, setRole] = useState<keyof typeof roleContent>("STUDENT");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0%,#0f172a_55%,#020617_100%)] p-6 text-slate-100">
      <div className="mx-auto max-w-5xl rounded-3xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">Demo Only · read-only sample data <Link href="/" className="ml-3 underline">Back to Home</Link></div>
      <div className="mx-auto mt-6 max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold">InternFlow Demo Workspace</h1>
        <p className="mt-2 text-slate-200">Switch demo roles below to preview each portal without login.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(roleContent).map((r) => (
            <button key={r} onClick={() => setRole(r as keyof typeof roleContent)} className={`rounded-lg px-3 py-2 text-sm ${role === r ? "bg-emerald-500 text-slate-950" : "border border-white/20"}`}>
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="text-xl font-semibold">{role.replace("_", " ")} view</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-200">
            {roleContent[role].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
