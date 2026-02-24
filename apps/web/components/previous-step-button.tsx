"use client";

import { ArrowLeft } from "lucide-react";

export function PreviousStepButton({ fallbackHref }: { fallbackHref: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }

        window.location.href = fallbackHref;
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
