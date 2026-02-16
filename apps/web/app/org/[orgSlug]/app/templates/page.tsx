import { prisma } from "@internflow/db/src";
import { TemplateBuilderForm } from "@/components/tenant/template-builder";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function TemplatesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const templates = await prisma.settings.findMany({
    where: { organizationId: access.membership.organizationId, key: { startsWith: "template_" } },
    orderBy: { id: "desc" }
  });

  const templateCards = templates.map((t) => {
    const value = (t.value ?? {}) as {
      name?: string;
      type?: "CHECKLIST" | "LOGBOOK" | "FORMS";
      setaCetaName?: string;
      status?: "DRAFT" | "PUBLISHED";
      config?: { items?: Array<{ label?: string; required?: boolean; expiryDays?: number; dueDaysFromStart?: number; allowedTypes?: string[] | string }> };
      json?: { items?: Array<{ label?: string; required?: boolean; expiryDays?: number; dueDaysFromStart?: number; allowedTypes?: string[] | string }> };
    };

    const rawItems = value.config?.items ?? value.json?.items ?? [];

    return {
      id: t.id,
      name: String(value.name || t.key),
      type: value.type ?? "CHECKLIST",
      setaCetaName: String(value.setaCetaName ?? ""),
      status: value.status ?? "DRAFT",
      items: rawItems.map((item) => ({
        label: String(item.label ?? "Untitled item"),
        required: Boolean(item.required),
        expiryDays: Number(item.expiryDays ?? 0),
        dueDaysFromStart: Number(item.dueDaysFromStart ?? 0),
        allowedTypes: Array.isArray(item.allowedTypes) ? item.allowedTypes.join(",") : String(item.allowedTypes ?? "pdf,jpg,png")
      }))
    };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Compliance Templates (SETA/CETA)</h1>
        <p className="mt-1 text-sm text-slate-600">Create, edit, and publish business-ready templates with guided clicks only.</p>
      </div>

      <TemplateBuilderForm orgSlug={params.orgSlug} templates={templateCards} />
    </div>
  );
}
