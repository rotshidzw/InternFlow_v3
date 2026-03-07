import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";

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

  if (!opportunity)
    return <div className="p-8 text-white">Opportunity not found.</div>;

  const email = cookies().get("if_user")?.value;
  const user = email
    ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    : null;

  const studentProfileDelegate = (
    prisma as unknown as {
      studentProfile?: {
        findUnique: (args: { where: { userId: string } }) => Promise<{
          skills: string[];
          education: unknown;
        } | null>;
      };
    }
  ).studentProfile;

  const [profile, studentProfile, cvDoc] = user
    ? await Promise.all([
        prisma.profile.findUnique({ where: { userId: user.id } }),
        studentProfileDelegate?.findUnique({ where: { userId: user.id } }) ??
          null,
        prisma.document.findFirst({ where: { userId: user.id, type: "CV" } }),
      ])
    : [null, null, null];

  const hasCv = Boolean(cvDoc);
  const hasEducation = Boolean(profile?.education || studentProfile?.education);
  const hasSkills = Boolean(studentProfile?.skills?.length);
  const hasContact = Boolean(profile?.phone || studentProfile?.phone);
  const isReadyToApply = hasCv && hasEducation && hasSkills && hasContact;

  const showApplyFailed = searchParams?.error === "apply-failed";
  const showUploadFailed = searchParams?.warning === "cv-upload-failed";

  return (
    <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">{opportunity.title}</h1>
      <p className="mt-2 text-slate-200">
        {opportunity.organization.name} · {opportunity.type}
      </p>
      <p className="mt-4 text-slate-100">{opportunity.description}</p>

      {(showApplyFailed || showUploadFailed) && (
        <div className="mb-4 grid gap-2">
          {showApplyFailed && (
            <p className="rounded-lg border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              Could not submit application right now. Please try again.
            </p>
          )}
          {showUploadFailed && (
            <p className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Application was submitted, but CV upload failed. Please upload CV
              from profile/documents.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/20 bg-slate-900/30 p-4 text-sm">
        <p className="font-semibold">Application readiness</p>
        <p className="mt-2">{hasCv ? "✔" : "⬜"} Upload CV</p>
        <p>{hasEducation ? "✔" : "⬜"} Add education history</p>
        <p>{hasSkills ? "✔" : "⬜"} Add skills</p>
        <p>{hasContact ? "✔" : "⬜"} Verify contact details</p>
        {isReadyToApply ? (
          <p className="mt-2 text-emerald-300">
            You are ready to apply. No additional document upload required.
          </p>
        ) : (
          <p className="mt-2 text-amber-300">
            Missing items can be added below while applying.
          </p>
        )}
      </div>

      <form
        action={`/api/opportunities/${opportunity.id}/apply`}
        method="post"
        encType="multipart/form-data"
        className="mt-6 space-y-3"
      >
        <input type="hidden" name="userId" value={user?.id ?? ""} />

        {!isReadyToApply && (
          <>
            {!hasCv && (
              <>
                <label className="block text-sm">
                  Upload CV (optional if already uploaded)
                </label>
                <input
                  name="file"
                  type="file"
                  className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-2"
                />
              </>
            )}
            {!hasEducation && (
              <input
                name="education"
                defaultValue={profile?.education ?? ""}
                placeholder="Add education history"
                className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-2"
              />
            )}
            {!hasSkills && (
              <input
                name="skills"
                defaultValue={studentProfile?.skills.join(", ") ?? ""}
                placeholder="Add skills (comma separated)"
                className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-2"
              />
            )}
            {!hasContact && (
              <input
                name="phone"
                defaultValue={profile?.phone ?? studentProfile?.phone ?? ""}
                placeholder="Verify contact details (phone number)"
                className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-2"
              />
            )}
          </>
        )}

        <button className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950">
          Apply now
        </button>
      </form>
    </div>
  );
}
