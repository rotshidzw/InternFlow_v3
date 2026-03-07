import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

export default async function OpportunityDetail({
  params,
  searchParams,
}: {
  params: { orgSlug: string; opportunitySlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const opportunity = await prisma.opportunity.findFirst({
    where: {
      organization: { slug: params.orgSlug },
      slug: params.opportunitySlug,
    },
    include: { organization: true },
  });

  if (!opportunity) {
    return (
      <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
        Opportunity not found.
      </div>
    );
  }

  const email = cookies().get("if_user")?.value;
  const user = email
    ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    : null;
  const context = user ? await resolveStudentTenantContext(user.id) : { type: "NONE" as const };

  const studentProfileDelegate = (
    prisma as unknown as {
      studentProfile?: {
        findUnique: (args: { where: { userId: string } }) => Promise<{
          skills: string[];
          education: unknown;
          phone: string | null;
        } | null>;
      };
    }
  ).studentProfile;

  const [profile, studentProfile, cvDoc] = user
    ? await Promise.all([
        prisma.profile.findUnique({ where: { userId: user.id } }),
        studentProfileDelegate?.findUnique({ where: { userId: user.id } }) ?? null,
        prisma.document.findFirst({ where: { userId: user.id, type: "CV" } }),
      ])
    : [null, null, null];

  const hasCv = Boolean(cvDoc);
  const hasEducation = Boolean(profile?.education || studentProfile?.education);
  const hasSkills = Boolean(studentProfile?.skills?.length);
  const hasContact = Boolean(profile?.phone || studentProfile?.phone);
  const isReadyToApply = hasCv && hasEducation && hasSkills && hasContact;

  const hasActiveProgram = context.type === "ENROLLED" && context.enrollment.status !== "COMPLETED";

  const showApplyFailed = searchParams?.error === "apply-failed";
  const showUploadFailed = searchParams?.warning === "cv-upload-failed";

  return (
    <div className="mx-auto mt-10 max-w-4xl space-y-5 rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Opportunity details
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">{opportunity.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {opportunity.organization.name} · {opportunity.type}
          </p>
        </div>
        <Link
          href="/opportunities"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Back to opportunities
        </Link>
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {opportunity.description}
      </p>

      {hasActiveProgram && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You are currently active in {context.enrollment.programName}. New applications are disabled until your current programme is completed.
        </div>
      )}

      {context.type === "NONE" && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Not in a programme yet? You can still apply here, or join directly with an invite token from your student portal.
        </div>
      )}

      {(showApplyFailed || showUploadFailed) && (
        <div className="grid gap-2">
          {showApplyFailed && (
            <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              Could not submit application right now. Please try again.
            </p>
          )}
          {showUploadFailed && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Application was submitted, but CV upload failed. Please upload your CV from Edit profile.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-900">Application readiness</p>
        <p className="mt-2 text-slate-700">{hasCv ? "✔" : "⬜"} Upload CV</p>
        <p className="text-slate-700">{hasEducation ? "✔" : "⬜"} Add education history</p>
        <p className="text-slate-700">{hasSkills ? "✔" : "⬜"} Add skills</p>
        <p className="text-slate-700">{hasContact ? "✔" : "⬜"} Verify contact details</p>
        {isReadyToApply ? (
          <p className="mt-2 text-emerald-700">
            You are ready to apply.
          </p>
        ) : (
          <p className="mt-2 text-amber-700">
            Missing items can be added below while applying.
          </p>
        )}
      </div>

      <form
        action={`/api/opportunities/${opportunity.id}/apply`}
        method="post"
        encType="multipart/form-data"
        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <input type="hidden" name="userId" value={user?.id ?? ""} />

        {!isReadyToApply && (
          <>
            {!hasCv && (
              <>
                <label className="block text-sm font-medium text-slate-800">
                  Upload CV
                </label>
                <input
                  name="file"
                  type="file"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </>
            )}
            {!hasEducation && (
              <input
                name="education"
                defaultValue={profile?.education ?? ""}
                placeholder="Add education history"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
              />
            )}
            {!hasSkills && (
              <input
                name="skills"
                defaultValue={studentProfile?.skills.join(", ") ?? ""}
                placeholder="Add skills (comma separated)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
              />
            )}
            {!hasContact && (
              <input
                name="phone"
                defaultValue={profile?.phone ?? studentProfile?.phone ?? ""}
                placeholder="Verify contact details (phone number)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
              />
            )}
          </>
        )}

        <button
          disabled={hasActiveProgram || !user}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {hasActiveProgram ? "Application locked (active programme)" : "Apply now"}
        </button>
      </form>
    </div>
  );
}
