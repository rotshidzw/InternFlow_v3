"use client";

import { useMemo, useState } from "react";

type Programme = { id: string; name: string; startDate: string | Date; endDate: string | Date };
type ExportTemplate = { id: string; name: string; description: string | null };
type ExportJob = {
  id: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  createdAt: string;
  finishedAt: string | null;
  errorMessage?: string | null;
  programme: { name: string };
  exportTemplate: { name: string };
};

export function CloseoutExportsPanel({ orgSlug, programmes, templates, initialJobs }: { orgSlug: string; programmes: Programme[]; templates: ExportTemplate[]; initialJobs: ExportJob[] }) {
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [jobs, setJobs] = useState(initialJobs);
  const [loading, setLoading] = useState(false);

  const selectedProgramme = useMemo(() => programmes.find((p) => p.id === programmeId), [programmes, programmeId]);

  async function refreshJobs() {
    const res = await fetch(`/api/org/${orgSlug}/exports/closeout`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { jobs: ExportJob[] };
      setJobs(data.jobs);
    }
  }

  async function generate() {
    setLoading(true);
    const res = await fetch(`/api/org/${orgSlug}/exports/closeout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programmeId, exportTemplateId: templateId })
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Unable to create close-out job" }));
      alert(payload.detail ?? payload.error ?? "Unable to create close-out job");
    }

    await refreshJobs();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Generate Programme Close-Out Pack</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Programme
            <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2">
              {programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Export template
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2">
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedProgramme ? (
          <p className="text-xs text-slate-500">
            Programme dates: {new Date(selectedProgramme.startDate).toLocaleDateString()} - {new Date(selectedProgramme.endDate).toLocaleDateString()}
          </p>
        ) : null}
        <button
          disabled={loading || !programmeId || !templateId}
          onClick={generate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Close-Out Pack"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Export jobs</h3>
          <button className="text-sm text-slate-700 underline" onClick={refreshJobs}>
            Refresh
          </button>
        </div>
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium">
                  {job.programme.name} · {job.exportTemplate.name}
                </p>
                <p className="text-xs text-slate-500">Created {new Date(job.createdAt).toLocaleString()} · Status: {job.status}</p>
                {job.status === "FAILED" && job.errorMessage ? <p className="text-xs text-red-600">Reason: {job.errorMessage}</p> : null}
              </div>
              <div>
                {job.status === "DONE" ? (
                  <a href={`/api/exports/${job.id}/download`} className="rounded-lg border border-slate-300 px-3 py-1.5">
                    Download ZIP
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {jobs.length === 0 ? <p className="text-sm text-slate-500">No export jobs yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
