import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TemplatesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const templates = await prisma.settings.findMany({ where: { organizationId: access.membership.organizationId, key: { startsWith: "template_" } }, orderBy: { id: "desc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Compliance Templates (SETA/CETA)</h1>
      <form action={`/api/org/${params.orgSlug}/templates`} method="post" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <input required name="name" placeholder="Template name" className="rounded border border-slate-300 px-2 py-2 text-sm" />
          <select name="type" className="rounded border border-slate-300 px-2 py-2 text-sm"><option value="CHECKLIST">CHECKLIST</option><option value="LOGBOOK">LOGBOOK</option><option value="FORMS">FORMS</option></select>
          <input name="setaCetaName" placeholder="SETA/CETA reference" className="rounded border border-slate-300 px-2 py-2 text-sm" />
        </div>
        <textarea name="json" rows={6} defaultValue='{"items":[{"label":"Certified ID","required":true,"expiryDays":90}]}' className="rounded border border-slate-300 px-2 py-2 font-mono text-xs" />
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Save template</button>
      </form>
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">{String(t.value && (t.value as any).name || t.key)}</p>
            <p className="text-slate-600">Type: {String((t.value as any)?.type ?? "UNKNOWN")} · SETA/CETA: {String((t.value as any)?.setaCetaName ?? "n/a")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
