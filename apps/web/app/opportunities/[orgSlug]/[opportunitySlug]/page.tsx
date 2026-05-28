import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";
import { getCurrentUser } from "@/lib/session";

function applicationStatusLabel(status?: string | null) {
  if (!status) return "Not started";
  const normalized = status.toUpperCase();
  if (normalized === "DRAFT") return "Draft";
  if (["APPLIED", "SUBMITTED"].includes(normalized)) return "Submitted";
  if (["REVIEW", "SHORTLISTED"].includes(normalized)) return "Under review";
  if (normalized === "ACCEPTED") return "Accepted";
  if (normalized === "REJECTED") return "Rejected";
  return normalized;
}

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
      <div className="mx-auto mt-10 max-w-4xl">
        <div className="if-panel rounded-3xl p-8">Opportunity not found.</div>
      </div>
    );
  }

  const user = await getCurrentUser();
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

  const [profile, studentProfile, cvDoc, existingApplication] = user
    ? await Promise.all([
        prisma.profile.findUnique({ where: { userId: user.id } }),
        studentProfileDelegate?.findUnique({ where: { userId: user.id } }) ?? null,
        prisma.document.findFirst({ where: { userId: user.id, type: "CV" } }),
        prisma.application.findFirst({
          where: {
            userId: user.id,
            opportunityId: opportunity.id,
            status: { not: "REJECTED" },
          },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [null, null, null, null];

  const hasCv = Boolean(cvDoc);
  const hasEducation = Boolean(profile?.education || studentProfile?.education);
  const hasSkills = Boolean(studentProfile?.skills?.length);
  const hasContact = Boolean(profile?.phone || studentProfile?.phone);
  const isReadyToApply = hasCv && hasEducation && hasSkills && hasContact;
  const hasSubmittedApplication = Boolean(
    existingApplication &&
      ["APPLIED", "SUBMITTED", "REVIEW", "SHORTLISTED", "ACCEPTED"].includes(
        existingApplication.status,
      ),
  );

  const hasActiveProgram = context.type === "ENROLLED" && context.enrollment.status !== "COMPLETED";

  const showApplyFailed = searchParams?.error === "apply-failed";
  const showUploadFailed = searchParams?.warning === "cv-upload-failed";

  return (
    <div className="mx-auto mt-10 max-w-4xl space-y-5">
      <section className="if-panel rounded-3xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="if-kicker">Opportunity details</p>
            <h1 className="if-page-title mt-1 text-3xl">{opportunity.title}</h1>
            <p className="if-page-subtitle mt-2">
              {opportunity.organization.name} - {opportunity.type}
            </p>
          </div>
          <Link
            href="/opportunities"
            className="if-btn if-btn-secondary px-3 py-2 text-sm"
          >
            Back to opportunities
          </Link>
        </div>
      </section>

      <p className="if-panel-muted rounded-xl p-4 text-sm text-brand-textSoft">
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
              Could not process application right now. Please try again.
            </p>
          )}
          {showUploadFailed && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Application step was saved, but CV upload failed. Please upload your CV from Edit profile.
            </p>
          )}
        </div>
      )}

      <div className="if-panel rounded-xl p-4 text-sm">
        <p className="if-section-title">Application readiness</p>
        <p className="mt-1 text-brand-textSoft">
          Current application state:{" "}
          <span className="font-semibold text-brand-text">{applicationStatusLabel(existingApplication?.status)}</span>
        </p>
        <p className="mt-2 text-brand-textSoft">{hasCv ? "[x]" : "[ ]"} Upload CV</p>
        <p className="text-brand-textSoft">{hasEducation ? "[x]" : "[ ]"} Add education history</p>
        <p className="text-brand-textSoft">{hasSkills ? "[x]" : "[ ]"} Add skills</p>
        <p className="text-brand-textSoft">{hasContact ? "[x]" : "[ ]"} Verify contact details</p>
        {isReadyToApply ? (
          <p className="mt-2 text-emerald-700">You are ready to apply.</p>
        ) : (
          <p className="mt-2 text-amber-700">
            Missing items can be added below while saving draft or submitting.
          </p>
        )}
      </div>

      {existingApplication && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Your latest application for this opportunity is{" "}
          <span className="font-semibold">{applicationStatusLabel(existingApplication.status)}</span>.
        </div>
      )}

      <form
        action={`/api/opportunities/${opportunity.id}/apply`}
        method="post"
        encType="multipart/form-data"
        className="if-panel-muted space-y-3 rounded-xl p-4"
      >
        {!isReadyToApply && (
          <>
            {!hasCv && (
              <>
                <label className="block text-sm font-medium text-brand-textSoft">
                  Upload CV
                </label>
                <input
                  name="file"
                  type="file"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text"
                />
              </>
            )}
            {!hasEducation && (
              <input
                name="education"
                defaultValue={profile?.education ?? ""}
                placeholder="Add education history"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted"
              />
            )}
            {!hasSkills && (
              <input
                name="skills"
                defaultValue={studentProfile?.skills.join(", ") ?? ""}
                placeholder="Add skills (comma separated)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted"
              />
            )}
            {!hasContact && (
              <input
                name="phone"
                defaultValue={profile?.phone ?? studentProfile?.phone ?? ""}
                placeholder="Verify contact details (phone number)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted"
              />
            )}
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            name="intent"
            value="draft"
            disabled={hasActiveProgram || !user || hasSubmittedApplication}
            className="if-btn if-btn-secondary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            name="intent"
            value="submit"
            disabled={hasActiveProgram || !user || hasSubmittedApplication}
            className="if-btn if-btn-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasActiveProgram ? "Application locked (active programme)" : "Submit application"}
          </button>
        </div>
      </form>
    </div>
  );
}
