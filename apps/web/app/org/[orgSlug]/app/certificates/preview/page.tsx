"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function CertificatePreviewPage() {
  const params = useParams<{ orgSlug: string }>();
  const searchParams = useSearchParams();

  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";
  const enrollmentId = searchParams.get("enrollmentId") ?? "";

  const tenantName = String(searchParams.get("tenant") ?? "Tenant");
  const learnerName = searchParams.get("learner") ?? "Learner Name";
  const programmeName = searchParams.get("programme") ?? "Programme Name";

  const [managerName, setManagerName] = useState(searchParams.get("manager") ?? "Programme Manager");
  const [signature, setSignature] = useState(searchParams.get("signature") ?? searchParams.get("manager") ?? "Programme Manager");
  const [signatureImageBase64, setSignatureImageBase64] = useState<string | null>(null);
  const [signatureImageFile, setSignatureImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [issuedDocumentId, setIssuedDocumentId] = useState<string | null>(null);

  const downloadHref = useMemo(() => {
    if (!issuedDocumentId) return null;
    return `/api/org/${orgSlug}/certificates/${issuedDocumentId}/download`;
  }, [issuedDocumentId, orgSlug]);

  async function onSignatureImageSelected(file: File | null) {
    if (!file) {
      setSignatureImageBase64(null);
      setSignatureImageFile(null);
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

    setSignatureImageBase64(base64);
    setSignatureImageFile(file);
  }

  async function saveSignedCertificate() {
    if (!enrollmentId) {
      setSaveError("This preview is in demo mode. Open a learner row using View certificate on the certificates page, then save.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const formData = new FormData();
    formData.append("enrollmentId", enrollmentId);
    formData.append("managerName", managerName);
    formData.append("signature", signature);
    formData.append("tenantName", tenantName);
    if (signatureImageFile) {
      formData.append("signatureImage", signatureImageFile);
    }

    const response = await fetch(`/api/org/${orgSlug}/certificates/issue?response=json`, {
      method: "POST",
      body: formData
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
        <p className="text-sm text-slate-600">Edit signature details, save certificate PDF, then download.</p>
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
            Typed signature
            <input
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Type digital signature"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Signature image (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onSignatureImageSelected(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
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
          {!enrollmentId ? (
            <div className="text-xs text-amber-700">
              <p>
                Demo preview only. Save is disabled here. Open a learner row and click <strong>View certificate</strong> to edit and save.
              </p>
              <Link href={`/org/${orgSlug}/app/certificates`} className="mt-1 inline-block underline">
                Go to certificates issue list
              </Link>
            </div>
          ) : null}

          <Link href={`/org/${orgSlug}/app/certificates`} className="block rounded border border-slate-300 px-3 py-2 text-center text-sm text-slate-700">
            Back to certificates
          </Link>
        </div>

        <div className="rounded-2xl border-4 border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-8 shadow lg:col-span-2">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-slate-500">{tenantName} Programme Certification</p>
          <h2 className="mt-4 text-center text-4xl font-bold text-slate-900">Certificate of Completion</h2>
          <p className="mt-10 text-center text-slate-700">This certifies that</p>
          <p className="mt-2 text-center text-3xl font-semibold text-emerald-700">{learnerName}</p>
          <p className="mt-4 text-center text-slate-700">has successfully completed</p>
          <p className="mt-2 text-center text-xl font-semibold text-slate-900">{programmeName}</p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Authorised by</p>
              <p className="text-lg font-semibold text-slate-900">{managerName}</p>
              <p className="text-sm text-slate-600">Typed signature:</p>
              <p className="text-2xl text-slate-800" style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive' }}>{signature}</p>
              {signatureImageBase64 ? (
                <div className="mt-2 rounded border border-slate-200 bg-white p-2">
                  <p className="text-xs text-slate-500">Image signature preview</p>
                  <img src={signatureImageBase64} alt="Signature preview" className="mt-1 max-h-20 w-auto object-contain" />
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end">
              <div className="h-28 w-28 rounded-full border-4 border-rose-300 bg-rose-50/90 p-3 text-center text-xs font-semibold text-rose-700">
                <p>{tenantName.toUpperCase().slice(0, 16)}</p>
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
