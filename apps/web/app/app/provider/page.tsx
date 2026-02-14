import { prisma } from "@internflow/db/src";

export default async function ProviderPortal() {
  const programs = await prisma.program.findMany({ include: { opportunities: true, enrollments: true } });
  return <div className="space-y-4"><h1 className="text-2xl font-bold">Provider Portal</h1>{programs.map((p)=><div key={p.id} className="rounded-xl border bg-white p-4 dark:bg-slate-900"><h2>{p.name}</h2><p>{p.opportunities.length} opportunities · {p.enrollments.length} enrolled students</p></div>)}</div>;
}
