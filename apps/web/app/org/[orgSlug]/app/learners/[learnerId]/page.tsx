import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function LearnerPage({ params }: { params: { orgSlug: string; learnerId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const user = await prisma.user.findUnique({ where: { id: params.learnerId }, include: { studentProfile: true } });
  if (!user) return <div>Learner not found.</div>;

  const [applications, enrollments, docs, logs] = await Promise.all([
    prisma.application.findMany({ where: { userId: user.id, opportunity: { organizationId: access.membership.organizationId } }, include: { opportunity: true } }),
    prisma.enrollment.findMany({ where: { userId: user.id, organizationId: access.membership.organizationId }, include: { program: true } }),
    prisma.document.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { versions: true } }),
    prisma.logbookEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12, include: { approvals: true } })
  ]);

  const missingDocs = docs.filter((d) => ["SCAN_FAILED", "REJECTED"].includes(d.status)).length;
  const compliance = docs.length ? Math.max(5, Math.round(((docs.length - missingDocs) / docs.length) * 100)) : 0;
  const docsByType = docs.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.type] = (acc[doc.type] ?? 0) + 1;
    return acc;
  }, {});

  const idNumber = (user.studentProfile?.education as { idNumber?: string } | null)?.idNumber;
  const dateOfBirth = (user.studentProfile?.education as { dateOfBirth?: string } | null)?.dateOfBirth;
  const cvUrl = (user.studentProfile?.experience as { cvUrl?: string } | null)?.cvUrl;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Learner lifecycle: {user.studentProfile?.fullName ?? user.email}</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="font-semibold">Learner profile</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <p><span className="text-slate-500">Email:</span> {user.email}</p>
          <p><span className="text-slate-500">Phone:</span> {user.studentProfile?.phone ?? "Not captured"}</p>
          <p><span className="text-slate-500">ID Number:</span> {idNumber ?? "Not captured"}</p>
          <p><span className="text-slate-500">Date of Birth:</span> {dateOfBirth ?? "Not captured"}</p>
          <p className="md:col-span-2"><span className="text-slate-500">Location:</span> {user.studentProfile?.location ?? "Not captured"}</p>
          <p className="md:col-span-2"><span className="text-slate-500">Bio:</span> {user.studentProfile?.bio ?? "Not captured"}</p>
          <p className="md:col-span-2"><span className="text-slate-500">CV:</span> {cvUrl ? <a className="text-blue-600 underline" href={cvUrl} target="_blank">Open profile CV</a> : "Not captured"}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Compliance</p><p className="text-2xl font-semibold">{compliance}%</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Applications</p><p className="text-2xl font-semibold">{applications.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Enrollments</p><p className="text-2xl font-semibold">{enrollments.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Missing docs</p><p className="text-2xl font-semibold">{missingDocs}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <p className="font-medium">Per-learner documentation</p>
          <div className="mt-2 space-y-2">
            {Object.entries(docsByType).length === 0 ? <p className="text-slate-500">No documents uploaded.</p> : Object.entries(docsByType).map(([type, count]) => (
              <p key={type} className="rounded-lg border border-slate-200 px-3 py-2">{type}: <span className="font-semibold">{count}</span></p>
            ))}
          </div>
          <Link href={`/org/${params.orgSlug}/app/documents`} className="mt-3 inline-block text-xs text-blue-600">Open document repository</Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <p className="font-medium">Logbook status & progression</p>
          <div className="mt-2 space-y-2">
            {logs.length === 0 ? <p className="text-slate-500">No logbook entries yet.</p> : logs.map((l) => (
              <p key={l.id} className="rounded-lg border border-slate-200 px-3 py-2">Week {l.weekStart.toISOString().slice(0, 10)} · approvals {l.approvals.length}</p>
            ))}
          </div>
          <Link href={`/org/${params.orgSlug}/app/logbooks`} className="mt-3 inline-block text-xs text-blue-600">Track progress</Link>
        </div>
      </div>
    </div>
  );
}
