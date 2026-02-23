"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export default function SetupPage() {
  const searchParams = useSearchParams();
  const forcedJoinMode = searchParams.get("mode") === "join";
  const tokenFromUrl =
    searchParams.get("token") ?? searchParams.get("inviteToken") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => {
    if (!forcedJoinMode) return "Create or join your InternFlow workspace";
    return token ? "Join tenant with invite" : "Join an InternFlow tenant";
  }, [forcedJoinMode, token]);

  async function joinWithToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Please enter an invite token.");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Could not join tenant.");
      return;
    }

    window.location.href = payload.redirectTo;
  }

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl md:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
        {forcedJoinMode ? "Student onboarding" : "Organisation onboarding"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>

      {forcedJoinMode ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-200">
            Join with an invite token to enter your tenant workspace and apply
            for opportunities.
          </p>

          <form onSubmit={joinWithToken} className="space-y-3">
            <label className="block text-sm text-slate-200">Invite token</label>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste invite token"
              className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3 text-white placeholder:text-slate-400"
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 disabled:opacity-60"
            >
              {busy ? "Joining..." : "Join organization"}
            </button>
          </form>

          <div className="rounded-xl border border-white/20 bg-slate-950/30 p-4">
            <p className="text-sm font-medium">No invite token yet?</p>
            <p className="mt-1 text-sm text-slate-300">
              Complete your student profile first, then explore public
              opportunities while waiting for an invite.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/onboarding/profile"
                className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
              >
                I don’t have a token
              </Link>
              <Link
                href="/explore"
                className="rounded-lg border border-emerald-300/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10"
              >
                Explore public opportunities
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-sm text-slate-200">
            Organisation admins can create a tenant workspace. Students should
            join via invite token.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/onboarding/create-org"
              className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950"
            >
              Create organization
            </Link>
            <Link
              href="/auth/setup?mode=join"
              className="rounded-xl border border-white/30 px-4 py-2"
            >
              Student join
            </Link>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
