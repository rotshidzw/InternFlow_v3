import { prisma } from "@internflow/db/src";
import { requirePlatformAccess } from "@/lib/hq/auth";
import Link from "next/link";

export default async function HqTenantsPage({ searchParams }: { searchParams?: { status?: string; industry?: string } }) {
  await requirePlatformAccess(["PLATFORM_ADMIN", "PLATFORM_SALES", "PLATFORM_SUPPORT", "PLATFORM_OPS"]);
  const status = searchParams?.status;
  const industry = searchParams?.industry;
  const tenants = await prisma.organization.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(industry ? { type: industry as any } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Tenant oversight</p>
        <h1 className="if-auth-title mt-2">Tenants directory</h1>
        <p className="if-auth-subtitle">Filter organizations by review state and type, then open each tenant workspace for operational detail.</p>
      </section>

      <form className="if-auth-form if-filter-grid md:grid-cols-[220px_220px_auto]">
        <select name="status" defaultValue={status ?? ""} className="rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING_REVIEW">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select name="industry" defaultValue={industry ?? ""} className="rounded-lg px-3 py-2 text-sm">
          <option value="">All industries</option>
          <option value="COMPANY">Company</option>
          <option value="TRAINING_PROVIDER">Training Provider</option>
          <option value="NGO">NGO</option>
        </select>
        <button className="if-btn if-btn-primary px-3 py-2 text-sm">Apply filters</button>
      </form>

      <div className="if-auth-table-wrap">
        <table className="if-table-hover min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Industry</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Health</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-brand-border/50">
                <td className="px-4 py-2">
                  <Link className="font-medium text-brand-text hover:text-brand-accentStrong" href={`/hq/tenants/${t.id}`}>
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`if-status ${
                      t.status === "APPROVED"
                        ? "if-status-approved"
                        : t.status === "PENDING_REVIEW"
                          ? "if-status-pending"
                          : "if-status-rejected"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-brand-textSoft">{t.type}</td>
                <td className="px-4 py-2 text-brand-textSoft">{t.createdAt.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2 text-brand-textSoft">
                  {t.status === "APPROVED" ? 90 : t.status === "PENDING_REVIEW" ? 55 : 30}%
                </td>
              </tr>
            ))}
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-brand-muted">
                  No tenants match current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
