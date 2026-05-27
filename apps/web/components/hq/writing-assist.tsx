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
    <div className="if-panel rounded-2xl p-4">
      <h3 className="if-card-title">Writing Assistant (Grammarly-style)</h3>
      <p className="if-meta-text mt-1">Local, no paid API. Helps clean meeting notes and tenant emails.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Type your meeting notes or outreach message..." className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <ul className="mt-2 list-disc pl-5 text-xs text-brand-textSoft">
        {hints.length === 0 ? <li>No suggestions. Looks good.</li> : hints.map((h) => <li key={h}>{h}</li>)}
      </ul>
    </div>
  );
}
