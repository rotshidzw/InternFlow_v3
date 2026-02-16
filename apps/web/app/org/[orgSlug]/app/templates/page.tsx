import { prisma } from "@internflow/db/src";
import { BadgeCheck, FileText, ListChecks } from "lucide-react";
import { TemplateBuilderForm } from "@/components/tenant/template-builder";
import { requireTenantAccess } from "@/lib/tenant-portal";

function typeTone(type: string) {
  if (type === "CHECKLIST") return "bg-blue-100 text-blue-700 border-blue-200";
  if (type === "LOGBOOK") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (type === "FORMS") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default async function TemplatesPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);
  const templates = await prisma.settings.findMany({
    where: { organizationId: access.membership.organizationId, key: { startsWith: "template_" } },
    orderBy: { id: "desc" }
  });

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Compliance Templates (SETA/CETA)</h1>
        <p className="mt-1 text-sm text-slate-600">Build realistic compliance packs with due windows, expiry controls, allowed file types, and required items.</p>
      </div>

      <TemplateBuilderForm orgSlug={params.orgSlug} />

      <section className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Saved templates</h2>
        {templates.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((t) => {
              const value = (t.value ?? {}) as {
                name?: string;
                type?: string;
                setaCetaName?: string;
                config?: { items?: Array<{ label?: string; required?: boolean; expiryDays?: number; dueDaysFromStart?: number }> };
                json?: { items?: Array<{ label?: string; required?: boolean; expiryDays?: number; dueDaysFromStart?: number }> };
              };
              const items = value.config?.items ?? value.json?.items ?? [];

              return (
                <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{String(value.name || t.key)}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${typeTone(String(value.type ?? "UNKNOWN"))}`}>{String(value.type ?? "UNKNOWN")}</span>
                  </div>
                  <p className="text-xs text-slate-600">SETA/CETA: {String(value.setaCetaName ?? "n/a")}</p>

                  <div className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {items.length ? (
                      items.slice(0, 3).map((item, index) => (
                        <p key={index} className="flex items-center gap-1 text-xs text-slate-700">
                          {item.required ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ListChecks className="h-3.5 w-3.5 text-slate-500" />}
                          {item.label ?? "Unnamed item"} · due {item.dueDaysFromStart ?? 0}d · expires {item.expiryDays ?? 0}d
                        </p>
                      ))
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <FileText className="h-3.5 w-3.5" />
                        Template saved without item preview.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">No templates yet. Create your first compliance template above.</p>
        )}
      </section>
    </div>
  );
}
