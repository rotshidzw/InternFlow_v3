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
    orderBy: { createdAt: "desc" },
  });

  const hasActiveProgram = context.type === "ENROLLED" && context.enrollment.status !== "COMPLETED";

  return (
    <div className="mx-auto mt-10 max-w-6xl space-y-5 rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Student opportunities
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Opportunities</h1>
          <p className="mt-2 text-sm text-slate-600">
            Browse and apply only when you are eligible. Active programme students cannot apply to new programmes.
          </p>
        </div>
        <Link
          href="/app/student"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Back to student portal
        </Link>
      </div>

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

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          name="q"
          placeholder="Search by title or description"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
          defaultValue={searchParams?.q ?? ""}
        />
        <select
          name="type"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          defaultValue={type ?? ""}
        >
          <option value="">All types</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="LEARNERSHIP">Learnership</option>
          <option value="MENTORSHIP">Mentorship</option>
          <option value="SKILLS_PROGRAM">Skills Program</option>
        </select>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Filter
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((opp) => (
          <Link
            key={opp.id}
            href={`/opportunities/${opp.organization.slug}/${opp.slug}`}
            className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
          >
            <p className="text-lg font-semibold text-slate-900 group-hover:text-slate-950">{opp.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              {opp.organization.name} · {opp.type}
            </p>
            <p className="mt-3 line-clamp-3 text-sm text-slate-700">{opp.description}</p>
          </Link>
        ))}
        {opportunities.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No opportunities found for this filter.
          </p>
        )}
      </div>
    </div>
  );
}
