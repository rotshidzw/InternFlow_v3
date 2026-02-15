import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";

export default async function OpportunityDetail({ params }: { params: { orgSlug: string; opportunitySlug: string } }) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { organization: { slug: params.orgSlug }, slug: params.opportunitySlug },
    include: { organization: true }
  });

  if (!opportunity) return <div className="p-8 text-white">Opportunity not found.</div>;

  const email = cookies().get("if_user")?.value;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  return (
    <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">{opportunity.title}</h1>
      <p className="mt-2 text-slate-200">{opportunity.organization.name} · {opportunity.type}</p>
      <p className="mt-4 text-slate-100">{opportunity.description}</p>
      <form action={`/api/opportunities/${opportunity.id}/apply`} method="post" encType="multipart/form-data" className="mt-6 space-y-3">
        <input type="hidden" name="userId" value={user?.id ?? ""} />
        <label className="block text-sm">Required doc upload</label>
        <input name="file" type="file" required className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-2" />
        <button className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950">Apply now</button>
      </form>
    </div>
  );
}
