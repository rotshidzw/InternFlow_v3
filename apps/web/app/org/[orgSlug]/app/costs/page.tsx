import { prisma } from "@internflow/db/src";
import {
  COST_CATEGORIES,
  COST_STATUSES,
  loadOrganizationCostCaptureRecords,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";
import { requireTenantAccess } from "@/lib/tenant-portal";

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function categoryLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CostsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const canManage = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.STIPEND_MANAGE,
  );
  const canInspect = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.EXPORT_READ,
  );

  const [programmes, costRecords] = await Promise.all([
    prisma.program.findMany({
      where: { organizationId: access.membership.organizationId },
      orderBy: { startDate: "desc" },
    }),
    loadOrganizationCostCaptureRecords(access.membership.organizationId),
  ]);

  const totalsByCategory = COST_CATEGORIES.map((category) => {
    const total = costRecords
      .filter((record) => record.category === category)
      .reduce((sum, record) => sum + record.amount, 0);
    return { category, total };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Programme Cost Capture</h1>
        <p className="text-sm text-slate-600">
          Capture monthly delivery costs with evidence references for audit-ready reporting.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        {totalsByCategory.slice(0, 4).map((item) => (
          <div key={item.category} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            {categoryLabel(item.category)}: <span className="font-semibold">{item.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {canManage ? (
        <form
          action={`/api/org/${params.orgSlug}/cost-capture`}
          method="post"
          encType="multipart/form-data"
          className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3"
        >
          <select name="programmeId" className="rounded border border-slate-300 px-2 py-2 text-sm">
            <option value="">General (all programmes)</option>
            {programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.name}
              </option>
            ))}
          </select>
          <input
            name="month"
            defaultValue={thisMonth()}
            placeholder="YYYY-MM"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          />
          <select name="category" className="rounded border border-slate-300 px-2 py-2 text-sm">
            {COST_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            required
          />
          <select name="status" defaultValue="SUBMITTED" className="rounded border border-slate-300 px-2 py-2 text-sm">
            {COST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            name="evidenceFile"
            type="file"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          />
          <input
            name="notes"
            placeholder="Notes"
            className="rounded border border-slate-300 px-2 py-2 text-sm md:col-span-2"
          />
          <button className="rounded border border-indigo-300 px-2 py-2 text-sm text-indigo-700">
            Save cost entry
          </button>
        </form>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Your role can inspect costs but cannot submit or update cost entries.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Captured cost records</h2>
        <div className="mt-3 space-y-2 text-sm">
          {costRecords.length === 0 ? (
            <p className="text-slate-500">No cost entries captured yet.</p>
          ) : (
            costRecords.map((record) => (
              <div key={record.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  {record.month} | {categoryLabel(record.category)}
                </p>
                <p className="text-slate-600">
                  Amount: {record.amount.toFixed(2)} | Status: {record.status}
                </p>
                <p className="text-slate-600">
                  Notes: {record.notes ?? "None"} | Evidence files: {record.evidenceDocumentIds.length}
                </p>
                {canInspect && record.evidenceDocumentIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {record.evidenceDocumentIds.map((documentId, index) => (
                      <a
                        key={documentId}
                        href={`/api/org/${params.orgSlug}/cost-capture/evidence/${documentId}`}
                        className="rounded border border-slate-300 px-2 py-1 text-slate-700"
                      >
                        Evidence {index + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
