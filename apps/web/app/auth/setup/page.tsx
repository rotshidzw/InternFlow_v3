"use client";

import { useForm } from "react-hook-form";

export default function SetupPage() {
  const { register, handleSubmit } = useForm<{ mode: "create" | "join"; orgName?: string; inviteToken?: string }>({ defaultValues: { mode: "create" } });
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Organisation onboarding</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Create or join your InternFlow workspace</h1>
      <p className="mt-2 text-sm text-slate-200">Organisations register here first, then invite teams and launch student applications from their own tenant.</p>

      <form
        className="mt-6 space-y-3"
        onSubmit={handleSubmit(async (v) => {
          await fetch("/api/org/setup", { method: "POST", body: JSON.stringify(v) });
          alert("Organization setup complete");
        })}
      >
        <select {...register("mode")} className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3 text-white">
          <option value="create">Create organization</option>
          <option value="join">Join by invite token</option>
        </select>
        <input {...register("orgName")} placeholder="My Training Org" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3 text-white placeholder:text-slate-400" />
        <input {...register("inviteToken")} placeholder="Invite token (if joining)" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3 text-white placeholder:text-slate-400" />
        <button className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950">Continue</button>
      </form>
    </div>
  );
}
