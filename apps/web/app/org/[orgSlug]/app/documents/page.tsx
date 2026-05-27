import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

function validationBadge(doc: { type: string; status: string; expirationDate: Date | null; selfCertifiedAt: Date | null }) {
  if (doc.status === "SCAN_FAILED" || doc.status === "REJECTED") return "RETURN_TO_LEARNER";
  if (doc.status === "SCAN_PENDING") return "NEEDS_REVIEW";
  if (doc.expirationDate && doc.expirationDate < new Date()) return "EXPIRED";
  if (["CERTIFICATE", "AFFIDAVIT"].includes(doc.type) && !doc.selfCertifiedAt) return "MISSING_SELF_CERT";
  if (doc.status === "APPROVED" || doc.status === "SCAN_OK") return "ACCEPTED";
  return "REVIEW_REQUIRED";
}

const defaultRules = [
  { type: "ID", rule: "Name should match learner profile and be legible." },
  { type: "CV", rule: "Should include education + skills summary for profile prefill." },
  { type: "AFFIDAVIT", rule: "Must include city and required programme wording." },
  { type: "CERTIFICATE", rule: "Must be in date and aligned to programme requirement." },
  { type: "PROOF_OF_ADDRESS", rule: "Address details should be present and recent." },
];

export default async function DocumentsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const memberIds = await prisma.membership.findMany({ where: { organizationId: access.membership.organizationId }, select: { userId: true } });
  const docs = await prisma.document.findMany({ where: { userId: { in: memberIds.map((m) => m.userId) } }, include: { user: true, versions: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Document Vault + Review Workflow</h1>
        <p className="text-sm text-slate-600">
          Review learner uploads, classify status, and return files with clear reasons when correction is needed.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Tenant document rules (baseline)</h2>
          <Link className="text-sm text-blue-600" href={`/org/${params.orgSlug}/app/templates`}>Refine in templates</Link>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2 text-sm">
          {defaultRules.map((rule) => (
            <div key={rule.type} className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{rule.type}</p>
              <p className="text-slate-600">{rule.rule}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-2">
        {docs.map((d) => {
          const badge = validationBadge(d);
          return (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="font-medium text-slate-900">{d.user.email} · {d.type}</p>
              <p className="text-slate-600">Review state: {d.status} · Validation: {badge}</p>
              <p className="text-xs text-slate-500">Uploaded: {d.createdAt.toISOString().slice(0,10)} · File: {d.versions[0]?.mimeType ?? "n/a"}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={`/api/org/${params.orgSlug}/documents/${d.id}/review`} method="post" className="flex items-center gap-2">
                  <input type="hidden" name="decision" value="approve" />
                  <button className="rounded-lg border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Accept</button>
                </form>
                <form action={`/api/org/${params.orgSlug}/documents/${d.id}/review`} method="post" className="flex items-center gap-2">
                  <input type="hidden" name="decision" value="return" />
                  <input name="reason" placeholder="Return reason" className="rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                  <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700">Return for correction</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
