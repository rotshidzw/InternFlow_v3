"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";

type TemplateType = "CHECKLIST" | "LOGBOOK" | "FORMS";

type ChecklistItem = {
  label: string;
  required: boolean;
  expiryDays: number;
  dueDaysFromStart: number;
  allowedTypes: string;
};

const defaultItem = (): ChecklistItem => ({
  label: "Certified ID",
  required: true,
  expiryDays: 90,
  dueDaysFromStart: 7,
  allowedTypes: "pdf,jpg,png"
});

export function TemplateBuilderForm({ orgSlug }: { orgSlug: string }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TemplateType>("CHECKLIST");
  const [setaCetaName, setSetaCetaName] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([defaultItem()]);

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

  const payload = useMemo(() => {
    return {
      items: items.map((item, index) => ({
        order: index + 1,
        label: item.label,
        required: item.required,
        expiryDays: item.expiryDays,
        dueDaysFromStart: item.dueDaysFromStart,
        allowedTypes: item.allowedTypes.split(",").map((typeName) => typeName.trim()).filter(Boolean)
      }))
    };
  }, [items]);

  return (
    <form action={`/api/org/${orgSlug}/templates`} method="post" className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Build compliance template</h2>
          <p className="text-xs text-slate-600">Use structured fields instead of raw JSON. Save once and apply in programs.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => applyPreset("onboarding")} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            Onboarding preset
          </button>
          <button type="button" onClick={() => applyPreset("monthlyLogbook")} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
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

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Template items</p>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, defaultItem()])}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Add item
          </button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[2fr_110px_110px_130px_auto]">
            <input
              value={item.label}
              onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, label: event.target.value } : x)))}
              placeholder="Item label"
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={item.expiryDays}
              onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, expiryDays: Number(event.target.value || 0) } : x)))}
              placeholder="Expiry"
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={item.dueDaysFromStart}
              onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, dueDaysFromStart: Number(event.target.value || 0) } : x)))}
              placeholder="Due"
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              value={item.allowedTypes}
              onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, allowedTypes: event.target.value } : x)))}
              placeholder="pdf,jpg"
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
            <div className="flex items-center justify-end gap-2">
              <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(event) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, required: event.target.checked } : x)))}
                />
                Required
              </label>
              <button
                type="button"
                disabled={items.length === 1}
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-rose-200 px-2 py-1 text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-200">
        <p className="mb-1 font-semibold text-slate-100">Payload preview</p>
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
      </div>

      <textarea readOnly name="json" value={JSON.stringify(payload)} className="hidden" />
      <button className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">Save template</button>
    </form>
  );
}
