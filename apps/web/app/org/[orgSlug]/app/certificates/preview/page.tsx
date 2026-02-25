"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function CertificatePreviewPage() {
  const params = useParams<{ orgSlug: string }>();
  const searchParams = useSearchParams();

  const orgSlug = params.orgSlug;
  const enrollmentId = searchParams.get("enrollmentId") ?? "";

  const tenantName = searchParams.get("tenant") ?? "Tenant";
  const learnerName = searchParams.get("learner") ?? "Learner Name";
  const programmeName = searchParams.get("programme") ?? "Programme Name";

  const [managerName, setManagerName] = useState(searchParams.get("manager") ?? "Programme Manager");
  const [signature, setSignature] = useState(searchParams.get("signature") ?? "Signed digitally");
  const [signatureImageBase64, setSignatureImageBase64] = useState<string | null>(null);
  const [signatureImageFile, setSignatureImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [issuedDocumentId, setIssuedDocumentId] = useState<string | null>(null);

  const issueDate = new Date().toISOString().slice(0, 10);
  const certificateId = useMemo(() => `IF-${(searchParams.get("enrollmentId") ?? "DEMO").slice(0, 8).toUpperCase()}`, [searchParams]);

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
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          .print-certificate { box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Certificate preview (corporate print design)</h1>
        <p className="text-sm text-slate-600">Balanced A4-style layout with print-safe hierarchy and spacing.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="no-print space-y-3 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <h2 className="font-semibold">Sign certificate</h2>
          <label className="block text-sm text-slate-700">
            Coordinator name
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

        <section
          className="print-certificate relative overflow-hidden rounded-xl bg-[#f2f6f4] p-5 shadow lg:col-span-2"
          style={{
            backgroundImage:
              "radial-gradient(circle at 8% 8%, rgba(20,120,80,0.08), transparent 38%), linear-gradient(135deg, rgba(20,60,40,0.05), rgba(20,120,80,0.08))"
          }}
        >
          <div className="relative mx-auto aspect-[1123/794] w-full border-2 border-[#C9B37E] p-4">
            <div className="flex h-full flex-col border-[3px] border-[#2E6F57] px-16 py-14">
              {/* Zone 1 */}
              <header className="text-center">
                <p className="text-[16px] uppercase tracking-[0.18em] text-[#3B5D4F]">{tenantName} Programme Certification</p>
                <div className="mt-3 h-px bg-[#2E6F57]/50" />
              </header>

              {/* Zone 2 */}
              <main className="grid flex-1 place-items-center py-8 text-center">
                <div className="space-y-4">
                  <h2 className="text-[52px] font-bold leading-tight text-[#1F2D3A]">Certificate of Completion</h2>
                  <p className="text-[20px] text-[#4B5563]">This certifies that</p>
                  <p className="text-[48px] font-bold leading-tight text-[#157A6E]">{learnerName}</p>
                  <p className="text-[20px] text-[#4B5563]">has successfully completed</p>
                  <p className="text-[32px] font-semibold text-[#1F2937]">{programmeName}</p>
                  <p className="text-sm text-slate-500">Completed on {issueDate}</p>
                </div>
              </main>

              {/* Zone 3 */}
              <div className="mt-auto space-y-4">
                <div className="grid items-end gap-4 md:grid-cols-2">
                  <div className="text-left text-[#334155]">
                    <div className="mb-3 h-px w-52 bg-[#2E6F57]/60" />
                    <p className="text-base font-semibold">{managerName}</p>
                    <p className="text-sm text-slate-600">Programme Coordinator</p>
                    <p className="mt-1 text-sm text-slate-500">Signed digitally</p>
                    <p className="text-3xl" style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive' }}>{signature}</p>
                    {signatureImageBase64 ? <img src={signatureImageBase64} alt="Signature" className="mt-2 max-h-14 w-auto object-contain" /> : null}
                  </div>

                  <div className="flex justify-end">
                    <div className="grid h-40 w-40 place-items-center rounded-full border-4 border-rose-400/90 bg-rose-50/90 text-center text-rose-700 opacity-85">
                      <div className="space-y-1 leading-tight">
                        <p className="text-xl font-semibold">{tenantName.toUpperCase()}</p>
                        <p className="text-lg font-semibold">OFFICIAL</p>
                        <p className="text-lg font-semibold">STAMP</p>
                        <p className="text-sm">Verified</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#2E6F57]/50" />
                <footer className="grid grid-cols-3 items-center text-xs text-slate-600">
                  <p>Certificate ID: {certificateId}</p>
                  <p className="text-center font-semibold tracking-[0.08em]">INTERNFLOW</p>
                  <p className="text-right">Issue Date: {issueDate}</p>
                </footer>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
