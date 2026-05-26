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
      if (response.status === 401) {
        window.location.href = `/onboarding/profile?inviteToken=${encodeURIComponent(token.trim())}`;
        return;
      }
      setError(payload.error ?? "Could not join tenant.");
      return;
    }

    window.location.href = payload.redirectTo;
  }

  return (
    <div className="mx-auto mt-10 max-w-4xl">
      <div className="if-panel grid gap-0 overflow-hidden rounded-3xl md:grid-cols-[1fr_1.15fr]">
        <section className="border-b border-brand-border/70 bg-[#090c1f]/90 p-6 md:border-b-0 md:border-r">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-accentStrong">
            {forcedJoinMode ? "Student onboarding" : "Organisation onboarding"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-text">{title}</h1>
          <p className="mt-3 text-sm text-brand-textSoft">
            Enterprise-grade tenant access with invite-driven enrolment and controlled workspace
            activation.
          </p>
          <div className="if-panel-muted mt-6 p-4">
            <p className="text-sm font-semibold text-brand-text">Onboarding principles</p>
            <ul className="mt-2 space-y-1 text-xs text-brand-muted">
              <li>Invite-based tenant membership for learners</li>
              <li>Organisation setup reserved for provider/admin staff</li>
              <li>Secure routing to profile completion and workspace context</li>
            </ul>
          </div>
        </section>

        <section className="bg-[#070b19]/88 p-6 md:p-8">
          {forcedJoinMode ? (
            <div className="space-y-4">
              <p className="text-sm text-brand-textSoft">
                Join with an invite token to enter your tenant workspace and apply for
                opportunities.
              </p>

              <form onSubmit={joinWithToken} className="space-y-3">
                <label className="block text-sm text-brand-textSoft">Invite token</label>
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Paste invite token"
                  className="w-full px-3 py-3"
                />
                <button disabled={busy} className="if-btn if-btn-primary w-full py-3 disabled:opacity-60">
                  {busy ? "Joining..." : "Join organization"}
                </button>
              </form>

              <div className="if-panel-muted rounded-xl p-4">
                <p className="text-sm font-medium text-brand-text">No invite token yet?</p>
                <p className="mt-1 text-sm text-brand-muted">
                  Complete your student profile first, then explore public opportunities while
                  waiting for an invite.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/onboarding/profile" className="if-btn if-btn-secondary text-sm">
                    I do not have a token
                  </Link>
                  <Link href="/explore" className="if-btn if-btn-secondary text-sm">
                    Explore public opportunities
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-brand-textSoft">
                Organisation admins can create a tenant workspace. Students should join via invite
                token.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/register-organization" className="if-btn if-btn-primary px-4 py-2">
                  Create organization
                </Link>
                <Link href="/auth/setup?mode=join" className="if-btn if-btn-secondary px-4 py-2">
                  Student join
                </Link>
              </div>
            </div>
          )}

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

