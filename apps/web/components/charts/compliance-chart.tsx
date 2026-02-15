"use client";

export function ComplianceChart({ approved, pending, rejected }: { approved: number; pending: number; rejected: number }) {
  const data = [
    { name: "Approved", value: approved, color: "bg-emerald-500" },
    { name: "Pending", value: pending, color: "bg-amber-400" },
    { name: "Rejected", value: rejected, color: "bg-rose-500" }
  ];

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.name}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>{d.name}</span>
            <span>{d.value}</span>
          </div>
          <div className="h-3 rounded-full bg-white/10">
            <div
              className={`h-3 rounded-full ${d.color} transition-all duration-500`}
              style={{ width: `${Math.max(6, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
