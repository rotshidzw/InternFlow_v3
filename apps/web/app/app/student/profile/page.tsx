import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function StudentProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const studentProfile = await (
    prisma as unknown as {
      studentProfile?: {
        findUnique: (args: { where: { userId: string } }) => Promise<{
          fullName: string;
          phone: string | null;
          location: string | null;
          bio: string | null;
          skills: string[];
          education: unknown;
          experience: unknown;
        } | null>;
      };
    }
  ).studentProfile?.findUnique({ where: { userId: user.id } });

  const baseProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  const education =
    (studentProfile?.education as Record<string, unknown> | null) ?? {};
  const experience =
    (studentProfile?.experience as Record<string, unknown> | null) ?? {};

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Student profile
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {studentProfile?.fullName ?? user.name ?? "Student"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Professional learner profile details and records.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/student"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Back to portal
          </Link>
          <Link
            href="/app/student/profile/edit"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Edit profile
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Personal information
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">
                {studentProfile?.phone ?? baseProfile?.phone ?? "Not set"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium text-slate-900">
                {studentProfile?.location ?? "Not set"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Emergency contact</dt>
              <dd className="font-medium text-slate-900">
                {baseProfile?.emergencyContact ?? "Not set"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Professional summary
          </h2>
          <p className="mt-3 text-sm text-slate-700">
            {studentProfile?.bio || "No professional summary added yet."}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Skills
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(studentProfile?.skills ?? []).length === 0 && (
              <span className="text-sm text-slate-500">
                No skills captured yet.
              </span>
            )}
            {(studentProfile?.skills ?? []).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Education
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Highest qualification</dt>
              <dd className="font-medium text-slate-900">
                {String(
                  education.highestQualification ??
                    baseProfile?.education ??
                    "Not set",
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Institution</dt>
              <dd className="font-medium text-slate-900">
                {String(education.institutionName ?? "Not set")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Field of study</dt>
              <dd className="font-medium text-slate-900">
                {String(education.fieldOfStudy ?? "Not set")}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Experience
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Employment status</dt>
              <dd className="font-medium text-slate-900">
                {String(experience.employmentStatus ?? "Not set")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Current employer</dt>
              <dd className="font-medium text-slate-900">
                {String(experience.currentEmployer ?? "Not set")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Years experience</dt>
              <dd className="font-medium text-slate-900">
                {String(experience.yearsExperience ?? "Not set")}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
