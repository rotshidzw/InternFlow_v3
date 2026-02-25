import Link from "next/link";

export default function CertificatePreviewPage({
  params,
  searchParams
}: {
  params: { orgSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const learnerName = String(searchParams?.learner ?? "Learner Name");
  const programmeName = String(searchParams?.programme ?? "Programme Name");
  const managerName = String(searchParams?.manager ?? "Programme Manager");
  const signature = String(searchParams?.signature ?? "Signed digitally");
  const enrollmentId = String(searchParams?.enrollmentId ?? "");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Certificate preview (demo design)</h1>
        <p className="text-sm text-slate-600">Preview certificate design with stamp + signature before saving and downloading.</p>
      </div>

      <div className="rounded-2xl border-4 border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-8 shadow">
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

      <div className="flex flex-wrap gap-2">
        <Link href={`/org/${params.orgSlug}/app/certificates`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
          Back to certificates
        </Link>
        {enrollmentId ? (
          <form action={`/api/org/${params.orgSlug}/certificates/issue`} method="post" className="flex gap-2">
            <input type="hidden" name="enrollmentId" value={enrollmentId} />
            <input type="hidden" name="managerName" value={managerName} />
            <input type="hidden" name="signature" value={signature} />
            <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white">Save certificate</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
