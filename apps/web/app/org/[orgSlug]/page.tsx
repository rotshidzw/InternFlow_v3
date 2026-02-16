import { prisma } from "@internflow/db/src";
import Link from "next/link";

export default async function OrgPublicPage({ params }: { params: { orgSlug: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return <div className="p-8">Organization not found.</div>;

  return (
    <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-slate-500">InternFlow Tenant Portal</p>
      <h1 className="mt-2 text-4xl font-semibold">{org.name}</h1>
      <p className="mt-2 text-slate-600">This is your organization home. Staff and learners can login to continue program operations.</p>
      <div className="mt-5 flex gap-3">
        <Link href={`/org/${params.orgSlug}/login`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Tenant Login</Link>
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Back to InternFlow</Link>
      </div>
    </div>
  );
}
