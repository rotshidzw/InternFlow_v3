"use client";

import { useMemo, useState } from "react";

function grammarHints(text: string) {
  const hints: string[] = [];
  if (text && !/[.!?]$/.test(text.trim())) hints.push("End your message with punctuation for better clarity.");
  if (/\bi\b/.test(text)) hints.push("Capitalize 'I' in sentences.");
  if (/\s{2,}/.test(text)) hints.push("Remove extra spaces.");
  if (text.split(" ").length > 80) hints.push("Consider splitting into shorter sentences for readability.");
  return hints;
}

export function WritingAssist() {
  const [text, setText] = useState("");
  const hints = useMemo(() => grammarHints(text), [text]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <h3 className="font-semibold">Writing Assistant (Grammarly-style)</h3>
      <p className="mt-1 text-xs text-slate-500">Local, no paid API. Helps clean meeting notes and tenant emails.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Type your meeting notes or outreach message..." className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
        {hints.length === 0 ? <li>No suggestions. Looks good.</li> : hints.map((h) => <li key={h}>{h}</li>)}
      </ul>
    </div>
  );
}
