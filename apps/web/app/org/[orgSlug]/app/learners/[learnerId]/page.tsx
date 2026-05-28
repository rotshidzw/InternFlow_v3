import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { listTenantBoundLogbookEntryIds } from "@/lib/logbook-tenant-binding";

export default async function LearnerPage({ params }: { params: { orgSlug: string; learnerId: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const user = await prisma.user.findUnique({ where: { id: params.learnerId }, include: { studentProfile: true } });
  if (!user) return <div>Learner not found.</div>;
  const boundEntryIds = await listTenantBoundLogbookEntryIds(access.membership.organizationId);

  const [applications, enrollments, docs, logs] = await Promise.all([
    prisma.application.findMany({ where: { userId: user.id, opportunity: { organizationId: access.membership.organizationId } }, include: { opportunity: true } }),
    prisma.enrollment.findMany({ where: { userId: user.id, organizationId: access.membership.organizationId }, include: { program: true } }),
    prisma.document.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { versions: true } }),
    boundEntryIds.length
      ? prisma.logbookEntry.findMany({
          where: { userId: user.id, id: { in: boundEntryIds } },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { approvals: true },
        })
      : Promise.resolve([])
  ]);


  const docIds = docs.map((doc) => doc.id);
  const latestOcrEvents = docIds.length
    ? await prisma.auditEvent.findMany({
        where: {
          tenantId: access.membership.organizationId,
          entityType: "Document",
          entityId: { in: docIds },
          action: { in: ["OCR_SUCCESS", "OCR_FAILED"] }
        },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const ocrByDocumentId = new Map<string, { status: string; text: string; error: string }>();
  for (const event of latestOcrEvents) {
    if (ocrByDocumentId.has(event.entityId)) continue;
    const metadata = (event.metadata ?? {}) as Record<string, unknown>;
    ocrByDocumentId.set(event.entityId, {
      status: String(metadata.ocrStatus ?? (event.action === "OCR_SUCCESS" ? "SUCCESS" : "FAILED")),
      text: String(metadata.ocrText ?? ""),
      error: String(metadata.ocrError ?? "")
    });
  }

  const missingDocs = docs.filter((d) => ["SCAN_FAILED", "REJECTED"].includes(d.status)).length;
  const compliance = docs.length ? Math.max(5, Math.round(((docs.length - missingDocs) / docs.length) * 100)) : 0;
  const docsByType = docs.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.type] = (acc[doc.type] ?? 0) + 1;
    return acc;
  }, {});

  const educationData = (user.studentProfile?.education as { idNumber?: string; dateOfBirth?: string; addressDetails?: { city?: string; province?: string; addressLine1?: string } } | null) ?? null;
  const experienceData = (user.studentProfile?.experience as { cvUrl?: string; employmentStatus?: string; currentEmployer?: string; jobTitle?: string; emergencyContactName?: string; emergencyContactPhone?: string } | null) ?? null;

  const idNumber = educationData?.idNumber;
  const dateOfBirth = educationData?.dateOfBirth;
  const cvUrl = experienceData?.cvUrl;

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
          <p><span className="text-slate-500">Employment status:</span> {experienceData?.employmentStatus ?? "Not captured"}</p>
          <p><span className="text-slate-500">Current employer:</span> {experienceData?.currentEmployer ?? "Not captured"}</p>
          <p><span className="text-slate-500">Job title:</span> {experienceData?.jobTitle ?? "Not captured"}</p>
          <p><span className="text-slate-500">Emergency contact:</span> {experienceData?.emergencyContactName && experienceData?.emergencyContactPhone ? `${experienceData.emergencyContactName} (${experienceData.emergencyContactPhone})` : "Not captured"}</p>
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
        <p className="font-medium">OCR extraction</p>
        <div className="mt-2 space-y-2">
          {docs.length === 0 ? <p className="text-slate-500">No documents for OCR yet.</p> : docs.slice(0, 8).map((doc) => {
            const ocr = ocrByDocumentId.get(doc.id);
            const status = ocr?.status ?? "NOT_RUN";
            return (
              <div key={doc.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{doc.type}</p>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">OCR: {status}</span>
                </div>
                {ocr?.text ? <p className="mt-1 line-clamp-3 text-xs text-slate-600">{ocr.text}</p> : null}
                {ocr?.error ? <p className="mt-1 text-xs text-red-600">{ocr.error}</p> : null}
                <form method="post" action={`/api/org/${params.orgSlug}/documents/${doc.id}/ocr`} className="mt-2">
                  <button className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">Retry OCR</button>
                </form>
              </div>
            );
          })}
        </div>
      </div>

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
