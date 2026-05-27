"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="m-6 rounded-xl border bg-red-50 p-6">
      <h2 className="text-xl font-semibold text-red-700">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-600">{error.message}</p>
      <button onClick={reset} className="mt-3 rounded bg-red-600 px-3 py-2 text-white">Retry</button>
    </div>
  );
}
