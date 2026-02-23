"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

type SetupValues = {
  mode: "create" | "join";
  orgName?: string;
  inviteToken?: string;
};

export default function SetupPage() {
  const searchParams = useSearchParams();
  const forcedJoinMode = searchParams.get("mode") === "join";
  const inviteTokenFromUrl = searchParams.get("inviteToken") ?? "";

  const { register, handleSubmit, watch, setValue } = useForm<SetupValues>({
    defaultValues: {
      mode: forcedJoinMode ? "join" : "create",
      inviteToken: inviteTokenFromUrl,
    },
  });

  const selectedMode = watch("mode");

  useEffect(() => {
    if (forcedJoinMode) {
      setValue("mode", "join");
    }
    if (inviteTokenFromUrl) {
      setValue("inviteToken", inviteTokenFromUrl);
    }
  }, [forcedJoinMode, inviteTokenFromUrl, setValue]);

  const studentJoinCopy =
    "Students join an existing organisation using an invite link/token. You will be directed to that tenant workspace and can start applying for opportunities.";
  const orgCopy =
    "Organisation admins register here first, then invite teams and students into their own tenant.";

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
        {forcedJoinMode ? "Student join" : "Organisation onboarding"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-white">
        {forcedJoinMode
          ? "Join an InternFlow tenant"
          : "Create or join your InternFlow workspace"}
      </h1>
      <p className="mt-2 text-sm text-slate-200">
        {forcedJoinMode ? studentJoinCopy : orgCopy}
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={handleSubmit(async (values) => {
          await fetch("/api/org/setup", {
            method: "POST",
            body: JSON.stringify(values),
          });
          alert(
            values.mode === "join"
              ? "Invite accepted. Continue to your tenant portal to apply."
              : "Organization setup complete",
          );
        })}
      >
        <select
          {...register("mode")}
          disabled={forcedJoinMode}
          className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3 text-white disabled:opacity-60"
        >
          <option value="create">Create organization</option>
          <option value="join">Join by invite token</option>
        </select>

        {selectedMode === "create" && !forcedJoinMode && (
          <input
            {...register("orgName")}
            placeholder="My Training Org"
            className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3 text-white placeholder:text-slate-400"
          />
        )}

        <input
          {...register("inviteToken")}
          placeholder="Paste invite token"
          className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3 text-white placeholder:text-slate-400"
        />

        <button className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950">
          {selectedMode === "join" || forcedJoinMode
            ? "Join organization"
            : "Continue"}
        </button>
      </form>
    </div>
  );
}
