"use client";

import Link from "next/link";

export default function CertificatesError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
      <h2 className="text-lg font-semibold">Certificate page error</h2>
      <p className="mt-1 text-sm">
        Something went wrong while loading this certificate view. Please retry.
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
        <Link
          href="./"
          className="rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700"
        >
          Back to certificates
        </Link>
      </div>
    </div>
  );
}
