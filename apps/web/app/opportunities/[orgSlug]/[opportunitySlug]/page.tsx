import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";

export default async function OpportunityDetail({
  params,
}: {
  params: { orgSlug: string; opportunitySlug: string };
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

  const [profile, studentProfile, cvDoc] = user
    ? await Promise.all([
        prisma.profile.findUnique({ where: { userId: user.id } }),
        prisma.studentProfile.findUnique({ where: { userId: user.id } }),
        prisma.document.findFirst({ where: { userId: user.id, type: "CV" } }),
      ])
    : [null, null, null];

  const hasCv = Boolean(cvDoc);
  const hasEducation = Boolean(profile?.education || studentProfile?.education);
  const hasSkills = Boolean(studentProfile?.skills?.length);
  const hasContact = Boolean(profile?.phone);
  const isReadyToApply = hasCv && hasEducation && hasSkills && hasContact;

  return (
    <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">{opportunity.title}</h1>
      <p className="mt-2 text-slate-200">
        {opportunity.organization.name} · {opportunity.type}
      </p>
      <p className="mt-4 text-slate-100">{opportunity.description}</p>

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
                defaultValue={profile?.phone ?? ""}
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
