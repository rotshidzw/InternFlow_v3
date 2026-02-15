import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function PlatformDashboardPage() {
  const email = cookies().get("if_user")?.value;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || user.role !== "SYSTEM_ADMIN") return <div className="p-8 text-white">Access denied.</div>;

  const [orgs, users, apps, audits] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.application.count(),
    prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <div className="mx-auto mt-10 max-w-6xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">Platform Dashboard</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/15 bg-white/5 p-4"><p className="text-sm">Organizations</p><p className="text-3xl font-bold">{orgs}</p></div>
        <div className="rounded-xl border border-white/15 bg-white/5 p-4"><p className="text-sm">Users</p><p className="text-3xl font-bold">{users}</p></div>
        <div className="rounded-xl border border-white/15 bg-white/5 p-4"><p className="text-sm">Applications</p><p className="text-3xl font-bold">{apps}</p></div>
      </div>
      <Link href="/platform-admin" className="mt-4 inline-block rounded-lg bg-emerald-500 px-3 py-2 text-slate-950">Open approval queue</Link>
      <section className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="font-semibold">Audit logs</h2>
        {audits.map((a) => <p key={a.id} className="mt-1 text-sm">{a.action} · {a.createdAt.toISOString()}</p>)}
      </section>
    </div>
  );
}
