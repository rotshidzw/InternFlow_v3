"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const DOC_TYPES = [
  "ID",
  "CV",
  "CERTIFICATE",
  "AFFIDAVIT",
  "PROOF_OF_ADDRESS",
  "PAYSLIP",
] as const;

type CvExtractedFields = {
  fullName?: string;
  phone?: string;
  idNumber?: string;
  dateOfBirth?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skills?: string[];
  bio?: string;
};

export default function StudentProfileOnboardingPage() {
  const searchParams = useSearchParams();
  const inviteTokenFromUrl =
    searchParams.get("inviteToken") ?? searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState(inviteTokenFromUrl);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("South Africa");
  const [postalCode, setPostalCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [bio, setBio] = useState("");
  const [skillsInput, setSkillsInput] = useState("");

  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [citizenship, setCitizenship] = useState("South African");
  const [disabilityStatus, setDisabilityStatus] = useState("PREFER_NOT_TO_SAY");
  const [disabilityDetails, setDisabilityDetails] = useState("");

  const [highestQualification, setHighestQualification] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");

  const [employmentStatus, setEmploymentStatus] = useState("");
  const [currentEmployer, setCurrentEmployer] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [preferredProgrammeType, setPreferredProgrammeType] = useState("");
  const [availability, setAvailability] = useState("");

  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const [cvUrl, setCvUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [consentToShareProfile, setConsentToShareProfile] = useState(false);
  const [isDiscoverable, setIsDiscoverable] = useState(false);

  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvParseBusy, setCvParseBusy] = useState(false);
  const [cvParseMessage, setCvParseMessage] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] =
    useState<(typeof DOC_TYPES)[number]>("ID");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefillLoaded, setPrefillLoaded] = useState(false);

  const skills = useMemo(
    () =>
      skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [skillsInput],
  );

  const languages = useMemo(
    () =>
      languagesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [languagesInput],
  );

  useEffect(() => {
    let active = true;

    async function loadExistingProfile() {
      try {
        const response = await fetch("/api/student-profile", { method: "GET" });
        const payload = await response.json();

        if (!active || !response.ok || !payload.ok || !payload.data) return;

        const data = payload.data as {
          email?: string;
          fullName?: string;
          phone?: string;
          location?: string;
          bio?: string;
          skills?: string[];
          education?: Record<string, unknown> | null;
          experience?: Record<string, unknown> | null;
          emergencyContact?: string;
        };

        if (data.email) setEmail((prev) => prev || data.email);
        if (data.fullName) setFullName((prev) => prev || data.fullName);
        if (data.phone) setPhone((prev) => prev || data.phone);
        if (data.location) setLocation((prev) => prev || data.location);
        if (data.bio) setBio((prev) => prev || data.bio);
        if (data.skills?.length)
          setSkillsInput((prev) => prev || data.skills!.join(", "));

        const educationData = (data.education ?? {}) as Record<string, unknown>;
        const experienceData = (data.experience ?? {}) as Record<
          string,
          unknown
        >;

        if (educationData.highestQualification)
          setHighestQualification(
            (prev) => prev || String(educationData.highestQualification),
          );
        if (educationData.institutionName)
          setInstitutionName(
            (prev) => prev || String(educationData.institutionName),
          );
        if (educationData.fieldOfStudy)
          setFieldOfStudy((prev) => prev || String(educationData.fieldOfStudy));
        if (educationData.graduationYear)
          setGraduationYear(
            (prev) => prev || String(educationData.graduationYear),
          );
        if (educationData.idNumber)
          setIdNumber((prev) => prev || String(educationData.idNumber));
        if (educationData.dateOfBirth)
          setDateOfBirth((prev) => prev || String(educationData.dateOfBirth));
        if (educationData.gender)
          setGender((prev) => prev || String(educationData.gender));
        if (educationData.citizenship)
          setCitizenship((prev) => prev || String(educationData.citizenship));
        if (educationData.city)
          setCity((prev) => prev || String(educationData.city));
        if (educationData.province)
          setProvince((prev) => prev || String(educationData.province));
        if (educationData.country)
          setCountry((prev) => prev || String(educationData.country));
        if (educationData.postalCode)
          setPostalCode((prev) => prev || String(educationData.postalCode));

        const addressDetails =
          (educationData.addressDetails as
            | Record<string, unknown>
            | undefined) ?? {};
        if (addressDetails.addressLine1)
          setAddressLine1(
            (prev) => prev || String(addressDetails.addressLine1),
          );
        if (addressDetails.addressLine2)
          setAddressLine2(
            (prev) => prev || String(addressDetails.addressLine2),
          );

        if (experienceData.employmentStatus)
          setEmploymentStatus(
            (prev) => prev || String(experienceData.employmentStatus),
          );
        if (experienceData.currentEmployer)
          setCurrentEmployer(
            (prev) => prev || String(experienceData.currentEmployer),
          );
        if (experienceData.jobTitle)
          setJobTitle((prev) => prev || String(experienceData.jobTitle));
        if (experienceData.yearsExperience)
          setYearsExperience(
            (prev) => prev || String(experienceData.yearsExperience),
          );
        if (experienceData.cvUrl)
          setCvUrl((prev) => prev || String(experienceData.cvUrl));
        if (experienceData.linkedinUrl)
          setLinkedinUrl((prev) => prev || String(experienceData.linkedinUrl));
        if (experienceData.portfolioUrl)
          setPortfolioUrl(
            (prev) => prev || String(experienceData.portfolioUrl),
          );
        if (experienceData.preferredProgrammeType)
          setPreferredProgrammeType(
            (prev) => prev || String(experienceData.preferredProgrammeType),
          );
        if (experienceData.availability)
          setAvailability(
            (prev) => prev || String(experienceData.availability),
          );
        if (experienceData.emergencyContactName)
          setEmergencyContactName(
            (prev) => prev || String(experienceData.emergencyContactName),
          );
        if (experienceData.emergencyContactPhone)
          setEmergencyContactPhone(
            (prev) => prev || String(experienceData.emergencyContactPhone),
          );
      } finally {
        if (active) setPrefillLoaded(true);
      }
    }

    loadExistingProfile();

    return () => {
      active = false;
    };
  }, []);

  function mergeCvFields(fields: CvExtractedFields) {
    if (fields.fullName && !fullName) setFullName(fields.fullName);
    if (fields.phone && !phone) setPhone(fields.phone);
    if (fields.idNumber && !idNumber) setIdNumber(fields.idNumber);
    if (fields.dateOfBirth && !dateOfBirth) setDateOfBirth(fields.dateOfBirth);
    if (fields.linkedinUrl && !linkedinUrl) setLinkedinUrl(fields.linkedinUrl);
    if (fields.portfolioUrl && !portfolioUrl)
      setPortfolioUrl(fields.portfolioUrl);
    if (fields.bio && !bio) setBio(fields.bio);
    if (fields.skills?.length) {
      const merged = Array.from(new Set([...skills, ...fields.skills]));
      setSkillsInput(merged.join(", "));
    }
  }

  async function parseCvAndAutofill() {
    setCvParseBusy(true);
    setCvParseMessage(null);

    const response = cvFile
      ? await (async () => {
          const formData = new FormData();
          formData.append("cvFile", cvFile);
          return fetch("/api/student-profile/cv-parse", {
            method: "POST",
            body: formData,
          });
        })()
      : await fetch("/api/student-profile/cv-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cvText }),
        });

    const payload = await response.json();
    setCvParseBusy(false);

    if (!response.ok || !payload.ok) {
      setCvParseMessage(payload.error ?? "Could not parse CV.");
      return;
    }

    mergeCvFields(payload.fields ?? {});
    setCvParseMessage(payload.note ?? "CV parsed. Review autofilled fields.");
  }

  async function uploadSupportingDocument() {
    if (!uploadFile) {
      setUploadMessage("Choose a file to upload.");
      return;
    }

    setUploadBusy(true);
    setUploadMessage(null);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("type", uploadType);
    formData.append("selfCertified", "false");

    const response = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setUploadBusy(false);

    if (!response.ok || payload.error) {
      setUploadMessage(
        typeof payload.error === "string" ? payload.error : "Upload failed.",
      );
      return;
    }

    setUploadMessage(
      `Uploaded ${uploadType} successfully. Verification: ${payload.verification}`,
    );
    setUploadFile(null);
  }

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
        email: email.trim() || undefined,
        inviteToken: inviteToken.trim() || undefined,
        fullName,
        phone,
        alternatePhone,
        location,
        city,
        province,
        country,
        postalCode,
        addressLine1,
        addressLine2,
        bio,
        skills,
        education: educationJson,
        experience: experienceJson,
        idNumber,
        dateOfBirth,
        gender,
        citizenship,
        disabilityStatus,
        disabilityDetails,
        highestQualification,
        institutionName,
        fieldOfStudy,
        graduationYear,
        employmentStatus,
        currentEmployer,
        jobTitle,
        yearsExperience,
        preferredProgrammeType,
        availability,
        emergencyContactName,
        emergencyContactPhone,
        languages,
        cvUrl,
        linkedinUrl,
        portfolioUrl,
        consentToShareProfile,
        isDiscoverable,
      }),
    });

    const payload = await response.json();
    setBusy(false);

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Could not save profile.");
      return;
    }

    window.location.href = payload.redirectTo ?? "/app/student/profile";
  }

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white/85 p-6 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white md:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
        Student onboarding
      </p>
      <h1 className="mt-2 text-3xl font-semibold">
        Create your full learner profile
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">
        Fill in your profile once so training providers and employers can
        evaluate you for internships, learnerships, and skills programmes.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {prefillLoaded
          ? "Existing profile fields were preloaded where available."
          : "Loading your existing profile..."}
      </p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/20 dark:bg-slate-950/30">
        <p className="text-sm font-semibold">
          Quick join if you already have a profile
        </p>
        <p className="text-xs text-slate-500">
          Paste invite token and join your programme directly.
        </p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            if (!inviteToken.trim()) {
              setError("Paste your invite token first.");
              return;
            }
            const response = await fetch("/api/auth/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: inviteToken.trim() }),
            });

            const payload = await response.json();
            if (response.ok && payload.ok) {
              window.location.href = payload.redirectTo;
              return;
            }

            if (response.status === 401) {
              setError(
                "Complete your profile below with email + token, then you will be joined automatically.",
              );
              return;
            }

            setError(payload.error ?? "Could not join with invite token.");
          }}
        >
          <input
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            placeholder="Paste invite token"
            className="min-w-[260px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-950/40"
          />
          <button className="rounded-xl border border-emerald-300/60 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-200">
            Join programme
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/20 dark:bg-slate-950/30">
        <h2 className="text-sm font-semibold">AI CV autofill</h2>
        <p className="text-xs text-slate-500">
          Upload your CV or paste CV text to auto-populate important profile
          fields, then review and edit before saving.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            type="file"
            onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-white/20 dark:bg-slate-950/40"
          />
          <button
            type="button"
            onClick={parseCvAndAutofill}
            disabled={cvParseBusy || (!cvFile && !cvText.trim())}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {cvParseBusy ? "Parsing CV..." : "Run AI CV autofill"}
          </button>
          <textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Or paste CV text here"
            rows={4}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
          />
        </div>
        {cvParseMessage && (
          <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">
            {cvParseMessage}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-3 md:grid-cols-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (required if not logged in)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={inviteToken}
          onChange={(e) => setInviteToken(e.target.value)}
          placeholder="Invite token (optional)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
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
          placeholder="Primary phone"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={alternatePhone}
          onChange={(e) => setAlternatePhone(e.target.value)}
          placeholder="Alternate phone"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
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
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          placeholder="Gender"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={citizenship}
          onChange={(e) => setCitizenship(e.target.value)}
          placeholder="Citizenship"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (city/province)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          placeholder="Province/State"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postal code"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="Address line 1"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />
        <input
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          placeholder="Address line 2"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />

        <input
          value={highestQualification}
          onChange={(e) => setHighestQualification(e.target.value)}
          placeholder="Highest qualification"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          placeholder="Institution"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={fieldOfStudy}
          onChange={(e) => setFieldOfStudy(e.target.value)}
          placeholder="Field of study"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={graduationYear}
          onChange={(e) => setGraduationYear(e.target.value)}
          placeholder="Graduation year"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={languagesInput}
          onChange={(e) => setLanguagesInput(e.target.value)}
          placeholder="Languages (comma separated)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />

        <input
          value={employmentStatus}
          onChange={(e) => setEmploymentStatus(e.target.value)}
          placeholder="Employment status"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={currentEmployer}
          onChange={(e) => setCurrentEmployer(e.target.value)}
          placeholder="Current employer"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Job title"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          placeholder="Years of experience"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={preferredProgrammeType}
          onChange={(e) => setPreferredProgrammeType(e.target.value)}
          placeholder="Preferred programme type"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          placeholder="Availability"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />

        <input
          value={emergencyContactName}
          onChange={(e) => setEmergencyContactName(e.target.value)}
          placeholder="Emergency contact name"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={emergencyContactPhone}
          onChange={(e) => setEmergencyContactPhone(e.target.value)}
          placeholder="Emergency contact phone"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />

        <select
          value={disabilityStatus}
          onChange={(e) => setDisabilityStatus(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        >
          <option value="PREFER_NOT_TO_SAY">
            Disability status: Prefer not to say
          </option>
          <option value="NONE">No disability</option>
          <option value="YES">Yes</option>
        </select>
        <input
          value={disabilityDetails}
          onChange={(e) => setDisabilityDetails(e.target.value)}
          placeholder="Disability details (optional)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />

        <input
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          placeholder="CV URL (optional)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />
        <input
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="LinkedIn URL"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />
        <input
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          placeholder="Portfolio URL"
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40"
        />

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio / professional summary"
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
          placeholder='Extra education JSON or text, e.g. {"nqfLevel":"5"}'
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Extra experience JSON or text"
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
        />

        <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-white/20 dark:bg-slate-950/30">
          <input
            type="checkbox"
            checked={consentToShareProfile}
            onChange={(e) => setConsentToShareProfile(e.target.checked)}
          />
          I consent to share this profile data with providers/employers for
          programme placement.
        </label>
        <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-white/20 dark:bg-slate-950/30">
          <input
            type="checkbox"
            checked={isDiscoverable}
            onChange={(e) => setIsDiscoverable(e.target.checked)}
          />
          Allow training providers to discover me in talent search.
        </label>

        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/20 dark:bg-slate-950/30">
          <p className="text-sm font-semibold">Upload important documents</p>
          <p className="text-xs text-slate-500">
            You can upload more documents now (ID, CV, certificates, affidavits,
            proof of address, payslips).
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select
              value={uploadType}
              onChange={(e) =>
                setUploadType(e.target.value as (typeof DOC_TYPES)[number])
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-white/20 dark:bg-slate-950/40"
            >
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"
            />
          </div>
          <button
            type="button"
            onClick={uploadSupportingDocument}
            disabled={uploadBusy}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
          >
            {uploadBusy ? "Uploading..." : "Upload document"}
          </button>
          {uploadMessage && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {uploadMessage}
            </p>
          )}
        </div>

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
