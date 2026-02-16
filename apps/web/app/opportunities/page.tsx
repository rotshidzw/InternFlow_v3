import { prisma } from "@internflow/db/src";
import Link from "next/link";

export default async function OpportunitiesPage({ searchParams }: { searchParams?: { q?: string; type?: string } }) {
  const q = searchParams?.q?.toLowerCase();
  const type = searchParams?.type;
  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: "PUBLISHED",
      ...(type ? { type: type as any } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {})
    },
    include: { organization: true }
  });

  return (
    <div className="mx-auto mt-10 max-w-6xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">Opportunities</h1>
      <form className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input name="q" placeholder="Search" className="rounded-xl border border-white/20 bg-slate-950/40 px-3 py-2" defaultValue={searchParams?.q ?? ""} />
        <select name="type" className="rounded-xl border border-white/20 bg-slate-950/40 px-3 py-2" defaultValue={type ?? ""}>
          <option value="">All types</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="LEARNERSHIP">Learnership</option>
          <option value="MENTORSHIP">Mentorship</option>
          <option value="SKILLS_PROGRAM">Skills Program</option>
        </select>
        <button className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950">Filter</button>
      </form>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {opportunities.map((opp) => (
          <Link key={opp.id} href={`/opportunities/${opp.organization.slug}/${opp.slug}`} className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="font-semibold">{opp.title}</p>
            <p className="text-sm text-slate-300">{opp.organization.name} · {opp.type}</p>
            <p className="mt-2 text-sm text-slate-200">{opp.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
