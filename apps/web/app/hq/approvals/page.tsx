import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";

function docStatusTone(value: unknown) {
  const ok = String(value ?? "").toLowerCase() === "uploaded";
  return ok
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";
}

export default async function HQApprovalsPage() {
  await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_OPS"]);

  const pending = await prisma.organizationVerification.findMany({
    where: { status: "PENDING" },
    include: { organization: true },
    orderBy: { createdAt: "desc" }
  });

  const total = pending.length;
  const avgReadiness = total
    ? Math.round(
        pending.reduce((sum, v) => {
          const docs = (v.docsJson as Record<string, unknown> | null) ?? {};
          const checks = [docs.CIPC, docs.BBBEE, docs.taxClearance, docs.proofOfAddress];
          const done = checks.filter((c) => String(c ?? "").toLowerCase() === "uploaded").length;
          return sum + Math.round((done / checks.length) * 100);
        }, 0) / total
      )
    : 0;

  return (
    <div className="if-auth-page gap-5">
      <section className="if-auth-hero">
        <p className="if-kicker">Compliance review</p>
        <h1 className="if-auth-title mt-2">Approvals</h1>
        <p className="if-auth-subtitle">Review tenant compliance submissions before activating organization access.</p>
      </section>

      <div className="if-auth-metrics md:grid-cols-3">
        <div className="if-auth-metric">
          <p className="if-auth-metric-label">Pending organizations</p>
          <p className="if-auth-metric-value">{total}</p>
        </div>
        <div className="if-auth-metric">
          <p className="if-auth-metric-label">Avg compliance readiness</p>
          <p className="if-auth-metric-value">{avgReadiness}%</p>
        </div>
        <div className="if-auth-metric">
          <p className="if-auth-metric-label">Action goal</p>
          <p className="if-auth-metric-value">48h SLA</p>
        </div>
      </div>

      {pending.length === 0 && (
        <div className="if-panel-muted rounded-2xl p-5 text-sm text-brand-muted">
          No pending approvals.
        </div>
      )}

      {pending.map((verification) => {
        const docs = (verification.docsJson as Record<string, unknown> | null) ?? {};
        const checks = [
          ["CIPC", docs.CIPC],
          ["BBBEE", docs.BBBEE],
          ["Tax Clearance", docs.taxClearance],
          ["Proof of Address", docs.proofOfAddress]
        ] as const;
        const done = checks.filter(([, value]) => String(value ?? "").toLowerCase() === "uploaded").length;

        return (
          <div key={verification.id} className="if-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-text">{verification.organization.name}</h2>
                <p className="text-sm text-brand-muted">Submitted: {verification.createdAt.toISOString()}</p>
              </div>
              <span className="if-status if-status-pending">
                Readiness {Math.round((done / checks.length) * 100)}%
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {checks.map(([label, value]) => (
                <div key={label} className="if-panel-muted rounded-xl p-3">
                  <p className="if-meta-text">{label}</p>
                  <p className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${docStatusTone(value)}`}>
                    {String(value ?? "missing")}
                  </p>
                </div>
              ))}
            </div>

            <details className="if-panel-muted mt-3 rounded-xl">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-brand-textSoft">View raw payload</summary>
              <pre className="overflow-auto px-3 pb-3 text-xs text-brand-textSoft">{JSON.stringify(verification.docsJson, null, 2)}</pre>
            </details>

            <div className="mt-4 flex flex-wrap gap-2">
              <form action={`/api/hq/approvals/${verification.id}`} method="post">
                <input type="hidden" name="decision" value="APPROVED" />
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                  Approve
                </button>
              </form>

              <form action={`/api/hq/approvals/${verification.id}`} method="post" className="flex flex-wrap gap-2">
                <input type="hidden" name="decision" value="REJECTED" />
                <input
                  name="reason"
                  placeholder="Reason for rejection"
                  required
                  className="min-w-[260px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text"
                />
                <button className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
                  Reject
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
