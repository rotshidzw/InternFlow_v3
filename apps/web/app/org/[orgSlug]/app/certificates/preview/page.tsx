"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function CertificatePreviewPage() {
  const params = useParams<{ orgSlug: string }>();
  const searchParams = useSearchParams();

  const orgSlug = params.orgSlug;
  const enrollmentId = searchParams.get("enrollmentId") ?? "";

  const learnerName = searchParams.get("learner") ?? "Learner Name";
  const programmeName = searchParams.get("programme") ?? "Programme Name";

  const [managerName, setManagerName] = useState(searchParams.get("manager") ?? "Programme Manager");
  const [signature, setSignature] = useState(searchParams.get("signature") ?? "Signed digitally");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [issuedDocumentId, setIssuedDocumentId] = useState<string | null>(null);

  const downloadHref = useMemo(() => {
    if (!issuedDocumentId) return null;
    return `/api/org/${orgSlug}/certificates/${issuedDocumentId}/download`;
  }, [issuedDocumentId, orgSlug]);

  async function saveSignedCertificate() {
    if (!enrollmentId) {
      setSaveError("Missing enrollment context. Open preview from an enrollment row.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const response = await fetch(`/api/org/${orgSlug}/certificates/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, managerName, signature })
    });

    const payload = await response.json().catch(() => ({ error: "Unable to save certificate" }));
    setSaving(false);

    if (!response.ok || !payload.ok) {
      setSaveError(payload.error ?? "Unable to save certificate");
      return;
    }

    setIssuedDocumentId(payload.documentId);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Certificate preview (demo design)</h1>
        <p className="text-sm text-slate-600">Sign certificate, save it, then download the signed PDF.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <h2 className="font-semibold">Sign certificate</h2>
          <label className="block text-sm text-slate-700">
            Manager name
            <input
              value={managerName}
              onChange={(event) => setManagerName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Signature
            <input
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Type digital signature"
            />
          </label>

          <button
            type="button"
            onClick={saveSignedCertificate}
            disabled={saving || !enrollmentId}
            className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save signed certificate"}
          </button>

          {downloadHref ? (
            <a href={downloadHref} className="block rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
              Download saved certificate
            </a>
          ) : null}

          {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
          {!enrollmentId ? <p className="text-xs text-amber-600">Open this page from an enrollment row to enable save/download.</p> : null}

          <Link href={`/org/${orgSlug}/app/certificates`} className="block rounded border border-slate-300 px-3 py-2 text-center text-sm text-slate-700">
            Back to certificates
          </Link>
        </div>

        <div className="rounded-2xl border-4 border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-8 shadow lg:col-span-2">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-slate-500">InternFlow Programme Certification</p>
          <h2 className="mt-4 text-center text-4xl font-bold text-slate-900">Certificate of Completion</h2>
          <p className="mt-10 text-center text-slate-700">This certifies that</p>
          <p className="mt-2 text-center text-3xl font-semibold text-emerald-700">{learnerName}</p>
          <p className="mt-4 text-center text-slate-700">has successfully completed</p>
          <p className="mt-2 text-center text-xl font-semibold text-slate-900">{programmeName}</p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Authorised by</p>
              <p className="text-lg font-semibold text-slate-900">{managerName}</p>
              <p className="text-sm text-slate-600">Signature: {signature}</p>
            </div>
            <div className="flex items-center justify-end">
              <div className="h-28 w-28 rounded-full border-4 border-rose-300 bg-rose-50/90 p-3 text-center text-xs font-semibold text-rose-700">
                <p>INTERNFLOW</p>
                <p className="mt-1">OFFICIAL</p>
                <p className="mt-1">STAMP</p>
                <p className="mt-2 text-[10px]">Verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
