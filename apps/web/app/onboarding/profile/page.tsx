"use client";

import { FormEvent, useMemo, useState } from "react";

export default function StudentProfileOnboardingPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const skills = useMemo(
    () =>
      skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [skillsInput],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    let educationJson: unknown = undefined;
    let experienceJson: unknown = undefined;
    if (education.trim()) {
      try {
        educationJson = JSON.parse(education);
      } catch {
        educationJson = { summary: education.trim() };
      }
    }
    if (experience.trim()) {
      try {
        experienceJson = JSON.parse(experience);
      } catch {
        experienceJson = { summary: experience.trim() };
      }
    }

    const response = await fetch("/api/student-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        location,
        bio,
        skills,
        education: educationJson,
        experience: experienceJson,
        idNumber,
        dateOfBirth,
        cvUrl,
        isDiscoverable,
      }),
    });

    const payload = await response.json();
    setBusy(false);

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Could not save profile.");
      return;
    }

    window.location.href = payload.redirectTo ?? "/explore";
  }

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white/85 p-6 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white md:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
        Student onboarding
      </p>
      <h1 className="mt-2 text-3xl font-semibold">
        Create your student profile
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">
        You can explore public opportunities even before joining a tenant.
        Complete your profile so providers can evaluate fit.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-3 md:grid-cols-2">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          placeholder="Full name"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (city/province)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />

        <input
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder="National ID / Passport number"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          placeholder="Date of birth (YYYY-MM-DD)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          placeholder="CV / portfolio URL (optional)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio"
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />
        <input
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
          placeholder="Skills (comma separated)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />
        <textarea
          value={education}
          onChange={(e) => setEducation(e.target.value)}
          placeholder='Education JSON or text, e.g. {"highest":"Diploma IT"}'
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Experience JSON or text"
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />

        <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-white/20 dark:bg-slate-950/30">
          <input
            type="checkbox"
            checked={isDiscoverable}
            onChange={(e) => setIsDiscoverable(e.target.checked)}
          />
          Allow training providers to find me by profile
        </label>

        <button
          disabled={busy}
          className="md:col-span-2 rounded-xl bg-emerald-500 py-3 font-medium text-slate-950 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save profile and continue"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
