import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

function validationBadge(status: string, doc: { expirationDate: Date | null; selfCertifiedAt: Date | null }) {
  if (status === "SCAN_FAILED") return "REJECTED";
  if (status === "SCAN_PENDING") return "NEEDS_REVIEW";
  if (doc.expirationDate && doc.expirationDate < new Date()) return "EXPIRED";
  if (!doc.selfCertifiedAt && ["CERTIFICATE", "AFFIDAVIT"].includes(status)) return "MISSING_SIGNATURE";
  return "VALID";
}

export default async function DocumentsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const memberIds = await prisma.membership.findMany({ where: { organizationId: access.membership.organizationId }, select: { userId: true } });
  const docs = await prisma.document.findMany({ where: { userId: { in: memberIds.map((m) => m.userId) } }, include: { user: true, versions: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Document Vault</h1>
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">{d.user.email} · {d.type}</p>
            <p className="text-slate-600">Review state: {d.status} · Validation: {validationBadge(d.status, d as any)}</p>
            <p className="text-xs text-slate-500">Uploaded: {d.createdAt.toISOString().slice(0,10)} · File: {d.versions[0]?.mimeType ?? "n/a"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
