"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

type TemplateType = "CHECKLIST" | "LOGBOOK" | "FORMS";
type TemplateStatus = "DRAFT" | "PUBLISHED";

type ChecklistItem = {
  label: string;
  required: boolean;
  expiryDays: number;
  dueDaysFromStart: number;
  allowedTypes: string;
};

type ExistingTemplate = {
  id: string;
  name: string;
  type: TemplateType;
  setaCetaName: string;
  status: TemplateStatus;
  items: ChecklistItem[];
};

const defaultItem = (): ChecklistItem => ({
  label: "Certified ID",
  required: true,
  expiryDays: 90,
  dueDaysFromStart: 7,
  allowedTypes: "pdf,jpg,png"
});

function statusTone(status: TemplateStatus) {
  return status === "PUBLISHED" ? "if-status if-status-success" : "if-status if-status-draft";
}

export function TemplateBuilderForm({ orgSlug, templates }: { orgSlug: string; templates: ExistingTemplate[] }) {
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<TemplateType>("CHECKLIST");
  const [setaCetaName, setSetaCetaName] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([defaultItem()]);

  function resetForm() {
    setTemplateId("");
    setName("");
    setType("CHECKLIST");
    setSetaCetaName("");
    setItems([defaultItem()]);
  }

  function startEditing(template: ExistingTemplate) {
    setTemplateId(template.id);
    setName(template.name);
    setType(template.type);
    setSetaCetaName(template.setaCetaName);
    setItems(template.items.length ? template.items : [defaultItem()]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyPreset(preset: "onboarding" | "monthlyLogbook") {
    if (preset === "onboarding") {
      setType("CHECKLIST");
      setName("Onboarding compliance pack");
      setItems([
        { label: "Certified ID", required: true, expiryDays: 90, dueDaysFromStart: 3, allowedTypes: "pdf,jpg,png" },
        { label: "Proof of Address", required: true, expiryDays: 90, dueDaysFromStart: 5, allowedTypes: "pdf,jpg,png" },
        { label: "Signed learner agreement", required: true, expiryDays: 365, dueDaysFromStart: 7, allowedTypes: "pdf" }
      ]);
      return;
    }

    setType("LOGBOOK");
    setName("Weekly supervisor logbook");
    setItems([
      { label: "Hours completed", required: true, expiryDays: 0, dueDaysFromStart: 7, allowedTypes: "text" },
      { label: "Tasks completed", required: true, expiryDays: 0, dueDaysFromStart: 7, allowedTypes: "text" },
      { label: "Supervisor sign-off", required: true, expiryDays: 0, dueDaysFromStart: 7, allowedTypes: "signature" }
    ]);
  }

  const payload = useMemo(
    () => ({
      items: items.map((item, index) => ({
        order: index + 1,
        label: item.label,
        required: item.required,
        expiryDays: item.expiryDays,
        dueDaysFromStart: item.dueDaysFromStart,
        allowedTypes: item.allowedTypes.split(",").map((typeName) => typeName.trim()).filter(Boolean)
      }))
    }),
    [items]
  );

  const requiredItems = items.filter((item) => item.required).length;

  return (
    <div className="space-y-4">
      <form action={`/api/org/${orgSlug}/templates`} method="post" className="if-auth-form space-y-4">
        <input type="hidden" name="templateId" value={templateId} readOnly />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{templateId ? "Edit compliance template" : "Create compliance template"}</h2>
            <p className="text-xs text-slate-600">Business-friendly setup with simple fields and buttons. No technical JSON required.</p>
          </div>
          <div className="flex gap-2">
            {templateId ? (
              <button type="button" onClick={resetForm} className="if-action-chip">
                Create new template
              </button>
            ) : null}
            <button type="button" onClick={() => applyPreset("onboarding")} className="if-action-chip">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              Onboarding preset
            </button>
            <button type="button" onClick={() => applyPreset("monthlyLogbook")} className="if-action-chip">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              Logbook preset
            </button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <input required name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Template name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          <select name="type" value={type} onChange={(event) => setType(event.target.value as TemplateType)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
            <option value="CHECKLIST">CHECKLIST</option>
            <option value="LOGBOOK">LOGBOOK</option>
            <option value="FORMS">FORMS</option>
          </select>
          <input name="setaCetaName" value={setaCetaName} onChange={(event) => setSetaCetaName(event.target.value)} placeholder="SETA/CETA reference" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="if-auth-metric">Total items: <span className="font-semibold">{items.length}</span></div>
          <div className="if-auth-metric">Required items: <span className="font-semibold">{requiredItems}</span></div>
          <div className="if-auth-metric">Optional items: <span className="font-semibold">{items.length - requiredItems}</span></div>
        </div>

        <div className="if-panel-muted space-y-2 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Template items</p>
            <button type="button" onClick={() => setItems((prev) => [...prev, defaultItem()])} className="if-btn if-btn-secondary px-2.5 py-1 text-xs font-medium">
              <Plus className="mr-1 inline h-3.5 w-3.5" /> Add item
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="if-panel grid gap-2 rounded-xl p-3 md:grid-cols-[2fr_130px_130px_130px_auto]">
              <input value={item.label} onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, label: event.target.value } : x)))} placeholder="Item label" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              <input type="number" min={0} value={item.expiryDays} onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, expiryDays: Number(event.target.value || 0) } : x)))} placeholder="Expiry days" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              <input type="number" min={0} value={item.dueDaysFromStart} onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, dueDaysFromStart: Number(event.target.value || 0) } : x)))} placeholder="Due days" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              <input value={item.allowedTypes} onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, allowedTypes: event.target.value } : x)))} placeholder="pdf,jpg" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              <div className="flex items-center justify-end gap-2">
                <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                  <input type="checkbox" checked={item.required} onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, required: event.target.checked } : x)))} />
                  Required
                </label>
                <button type="button" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} className="if-btn if-btn-secondary rounded-lg px-2 py-1 text-rose-300 disabled:cursor-not-allowed disabled:opacity-40">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <textarea readOnly name="json" value={JSON.stringify(payload)} className="hidden" />

        <div className="grid gap-2 md:grid-cols-2">
          <button name="status" value="DRAFT" className="if-btn if-btn-secondary w-full px-3 py-2.5 text-sm font-medium">
            Save as draft
          </button>
          <button name="status" value="PUBLISHED" className="if-btn if-btn-primary w-full px-3 py-2.5 text-sm font-medium">
            Publish template
          </button>
        </div>
      </form>

      <section className="if-panel space-y-2 rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-slate-900">Saved templates</h2>
        {templates.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="if-panel-muted rounded-xl p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{t.name}</p>
                  <span className={statusTone(t.status)}>{t.status}</span>
                </div>
                <p className="text-xs text-slate-600">{t.type} - SETA/CETA: {t.setaCetaName || "n/a"}</p>
                <div className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {t.items.slice(0, 3).map((item, index) => (
                    <p key={index} className="flex items-center gap-1 text-xs text-slate-700">
                      {item.required ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> : <span className="ml-[18px]" />}
                      {item.label} - due {item.dueDaysFromStart}d - expires {item.expiryDays}d
                    </p>
                  ))}
                </div>
                <button type="button" onClick={() => startEditing(t)} className="if-btn if-btn-secondary mt-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium">
                  <Pencil className="h-3.5 w-3.5" /> Edit template
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="if-empty-state px-3 py-8 text-center text-sm">No templates yet. Create your first compliance template above.</p>
        )}
      </section>
    </div>
  );
}
