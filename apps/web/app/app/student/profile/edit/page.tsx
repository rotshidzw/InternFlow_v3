"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function EditStudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [highestQualification, setHighestQualification] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [currentEmployer, setCurrentEmployer] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const skills = useMemo(
    () =>
      skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [skillsInput],
  );

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch("/api/student-profile");
      const payload = await response.json();

      if (!active) return;
      setLoading(false);

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Could not load profile.");
        return;
      }

      const data = payload.data ?? {};
      setEmail(data.email ?? "");
      setFullName(data.fullName ?? "");
      setPhone(data.phone ?? "");
      setLocation(data.location ?? "");
      setBio(data.bio ?? "");
      setSkillsInput((data.skills ?? []).join(", "));

      const education = (data.education ?? {}) as Record<string, unknown>;
      const experience = (data.experience ?? {}) as Record<string, unknown>;
      setHighestQualification(String(education.highestQualification ?? ""));
      setInstitutionName(String(education.institutionName ?? ""));
      setFieldOfStudy(String(education.fieldOfStudy ?? ""));
      setEmploymentStatus(String(experience.employmentStatus ?? ""));
      setCurrentEmployer(String(experience.currentEmployer ?? ""));
      setYearsExperience(String(experience.yearsExperience ?? ""));
      setEmergencyContactName(String(experience.emergencyContactName ?? ""));
      setEmergencyContactPhone(String(experience.emergencyContactPhone ?? ""));
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);

    const response = await fetch("/api/student-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email || undefined,
        fullName,
        phone,
        location,
        bio,
        skills,
        highestQualification,
        institutionName,
        fieldOfStudy,
        employmentStatus,
        currentEmployer,
        yearsExperience,
        emergencyContactName,
        emergencyContactPhone,
        citizenship: "South African",
        disabilityStatus: "PREFER_NOT_TO_SAY",
      }),
    });

    const payload = await response.json();
    setSaving(false);

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Could not save profile.");
      return;
    }

    setNotice("Profile saved successfully.");
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Edit profile
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Student profile sections
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Update details section-by-section and save your profile.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/student/profile"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            View profile
          </Link>
          <Link
            href="/app/student"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Portal home
          </Link>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Section 1 · Personal
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Full name"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Professional summary"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Section 2 · Education
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={highestQualification}
              onChange={(e) => setHighestQualification(e.target.value)}
              placeholder="Highest qualification"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Institution"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              placeholder="Field of study"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Section 3 · Experience
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              placeholder="Employment status"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={currentEmployer}
              onChange={(e) => setCurrentEmployer(e.target.value)}
              placeholder="Current employer"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="Years of experience"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Skills (comma separated)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-3"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Section 4 · Emergency contact
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              placeholder="Contact name"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              placeholder="Contact phone"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            disabled={saving || loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
          {loading && (
            <p className="text-sm text-slate-500">Loading profile...</p>
          )}
          {notice && <p className="text-sm text-emerald-700">{notice}</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>
      </form>
    </div>
  );
}
