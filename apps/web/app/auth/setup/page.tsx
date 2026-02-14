"use client";

import { useForm } from "react-hook-form";

export default function SetupPage() {
  const { register, handleSubmit } = useForm<{ mode: "create" | "join"; orgName?: string; inviteToken?: string }>({ defaultValues: { mode: "create" } });
  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-white p-6 dark:bg-slate-900">
      <h1 className="text-2xl font-bold">Organization setup</h1>
      <form
        className="mt-4 space-y-3"
        onSubmit={handleSubmit(async (v) => {
          await fetch("/api/org/setup", { method: "POST", body: JSON.stringify(v) });
          alert("Organization setup complete");
        })}
      >
        <select {...register("mode")} className="w-full rounded-lg border px-3 py-2">
          <option value="create">Create organization</option>
          <option value="join">Join by invite token</option>
        </select>
        <input {...register("orgName")} placeholder="My Training Org" className="w-full rounded-lg border px-3 py-2" />
        <input {...register("inviteToken")} placeholder="Invite token (if joining)" className="w-full rounded-lg border px-3 py-2" />
        <button className="w-full rounded-lg bg-emerald-600 py-2 text-white">Continue</button>
      </form>
    </div>
  );
}
