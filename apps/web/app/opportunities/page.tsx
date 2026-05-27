import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams?: { q?: string; type?: string };
}) {
  const q = searchParams?.q?.toLowerCase();
  const type = searchParams?.type;

  const email = cookies().get("if_user")?.value;
  const user = email
    ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    : null;
  const context = user ? await resolveStudentTenantContext(user.id) : { type: "NONE" as const };

  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: "PUBLISHED",
      ...(type ? { type: type as never } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { organization: true },
    orderBy: { id: "desc" },
  });

  const hasActiveProgram = context.type === "ENROLLED" && context.enrollment.status !== "COMPLETED";

  return (
    <div className="mx-auto mt-10 max-w-6xl space-y-5">
      <section className="if-panel rounded-3xl p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="if-kicker">Student opportunities</p>
            <h1 className="if-page-title mt-1 text-3xl">Opportunities</h1>
            <p className="if-page-subtitle mt-2">
              Browse and apply only when you are eligible. Active programme students cannot apply to new programmes.
            </p>
          </div>
          <Link
            href="/app/student"
            className="if-btn if-btn-secondary px-4 py-2 text-sm"
          >
            Back to student portal
          </Link>
        </div>
      </section>

      {hasActiveProgram && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You are already in an active programme ({context.enrollment.programName}). New applications are locked until completion.
        </div>
      )}

      {context.type === "NONE" && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Not enrolled yet? Complete your profile and use an invite token from the student portal to join directly.
        </div>
      )}

      <form className="if-panel-muted grid gap-3 rounded-xl p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          name="q"
          placeholder="Search by title or description"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted"
          defaultValue={searchParams?.q ?? ""}
        />
        <select
          name="type"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text"
          defaultValue={type ?? ""}
        >
          <option value="">All types</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="LEARNERSHIP">Learnership</option>
          <option value="MENTORSHIP">Mentorship</option>
          <option value="SKILLS_PROGRAM">Skills Program</option>
        </select>
        <button className="if-btn if-btn-primary px-4 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((opp) => (
          <Link
            key={opp.id}
            href={`/opportunities/${opp.organization.slug}/${opp.slug}`}
            className="if-panel-muted group rounded-2xl p-5 transition hover:border-brand-accent/45"
          >
            <p className="if-section-title group-hover:text-brand-accentStrong">{opp.title}</p>
            <p className="mt-1 text-sm text-brand-muted">
              {opp.organization.name} - {opp.type}
            </p>
            <p className="mt-3 line-clamp-3 text-sm text-brand-textSoft">{opp.description}</p>
          </Link>
        ))}
        {opportunities.length === 0 && (
          <p className="if-panel-muted rounded-xl px-4 py-3 text-sm text-brand-muted">
            No opportunities found for this filter.
          </p>
        )}
      </div>
    </div>
  );
}
