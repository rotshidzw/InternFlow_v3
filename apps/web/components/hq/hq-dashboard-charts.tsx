"use client";

type MetricPoint = {
  label: string;
  activeUsers: number;
  docsUploaded: number;
};

function Grid({ rows = 5 }: { rows?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="absolute left-0 right-0 border-t border-slate-200" style={{ top: `${(i / (rows - 1)) * 100}%` }} />
      ))}
    </div>
  );
}

function AxisLabels({ data }: { data: MetricPoint[] }) {
  return (
    <div className="mt-2 grid text-[11px] text-slate-500" style={{ gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))` }}>
      {data.map((d) => (
        <span key={d.label} className="text-center">{d.label}</span>
      ))}
    </div>
  );
}

function LineSvg({ data }: { data: MetricPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.activeUsers));
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 100 - (d.activeUsers / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-56 w-full">
      <polyline fill="none" stroke="#2563eb" strokeWidth="2.4" points={points} />
      {data.map((d, i) => {
        const x = (i / Math.max(1, data.length - 1)) * 100;
        const y = 100 - (d.activeUsers / max) * 100;
        return (
          <circle key={d.label} cx={x} cy={y} r="1.7" fill="#2563eb">
            <title>{`${d.label}: ${d.activeUsers} active users`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function Bars({ data }: { data: MetricPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.docsUploaded));

  return (
    <div className="flex h-56 items-end gap-2">
      {data.map((d) => {
        const h = Math.max(6, Math.round((d.docsUploaded / max) * 100));
        return (
          <div key={d.label} className="flex-1">
            <div className="group relative h-full rounded-t-md bg-emerald-500/90" style={{ height: `${h}%` }} title={`${d.label}: ${d.docsUploaded} docs`}>
              <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                {d.docsUploaded}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HQDashboardCharts({ data }: { data: MetricPoint[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Daily Active Users (14 days)</h3>
          <span className="text-xs text-blue-700">● Active Users</span>
        </div>
        <div className="relative rounded-lg bg-slate-50 p-3">
          <Grid />
          <LineSvg data={data} />
        </div>
        <AxisLabels data={data} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Documents Uploaded (14 days)</h3>
          <span className="text-xs text-emerald-700">■ Docs Uploaded</span>
        </div>
        <div className="relative rounded-lg bg-slate-50 p-3">
          <Grid />
          <Bars data={data} />
        </div>
        <AxisLabels data={data} />
      </div>
    </div>
  );
}
