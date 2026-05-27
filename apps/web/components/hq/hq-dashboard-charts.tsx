"use client";

type SeriesPoint = {
  label: string;
  value: number;
};

function Grid({ rows = 5 }: { rows?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-brand-border/45"
          style={{ top: `${(i / (rows - 1)) * 100}%` }}
        />
      ))}
    </div>
  );
}

function AxisLabels({ data, limit = 14 }: { data: SeriesPoint[]; limit?: number }) {
  const step = Math.max(1, Math.floor(data.length / limit));
  return (
    <div
      className="mt-2 grid text-[11px] text-brand-muted"
      style={{ gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))` }}
    >
      {data.map((d, i) => (
        <span key={`${d.label}-${i}`} className="text-center">
          {i % step === 0 ? d.label : ""}
        </span>
      ))}
    </div>
  );
}

function LineSvg({ data }: { data: SeriesPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 100 - (d.value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-56 w-full">
      <defs>
        <linearGradient id="hq-line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill="url(#hq-line-fill)" />
      <polyline fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" points={points} />
      {data.map((d, i) => {
        const x = (i / Math.max(1, data.length - 1)) * 100;
        const y = 100 - (d.value / max) * 100;
        return (
          <circle key={`${d.label}-${i}`} cx={x} cy={y} r="1.6" fill="#b794ff">
            <title>{`${d.label}: ${d.value} active users`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function Bars({ data }: { data: SeriesPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-56 items-end gap-1.5">
      {data.map((d, i) => {
        const h = d.value > 0 ? Math.max(8, Math.round((d.value / max) * 100)) : 0;
        return (
          <div key={`${d.label}-${i}`} className="flex h-full flex-1 items-end">
            <div className="relative h-full w-full rounded bg-[#111a36]">
              <div
                className="group absolute inset-x-0 bottom-0 rounded-t-md bg-gradient-to-t from-cyan-500/90 to-violet-500/90"
                style={{ height: `${h}%` }}
                title={`${d.label}: ${d.value} docs`}
              >
                <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-[#080d1f] px-2 py-1 text-[10px] text-brand-text group-hover:block">
                  {d.value}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HQDashboardCharts({
  activeSeries,
  docsSeries,
}: {
  activeSeries: SeriesPoint[];
  docsSeries: SeriesPoint[];
}) {
  const docsTotal = docsSeries.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="if-panel rounded-2xl p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-brand-textSoft">Daily Active Users (14 days)</h3>
          <span className="text-xs text-violet-300">Active users</span>
        </div>
        <div className="relative rounded-lg border border-brand-border/55 bg-[#0a1129] p-3">
          <Grid />
          <LineSvg data={activeSeries} />
        </div>
        <AxisLabels data={activeSeries} limit={14} />
      </div>

      <div className="if-panel rounded-2xl p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-brand-textSoft">Documents Uploaded (30 days)</h3>
          <span className="text-xs text-cyan-300">{docsTotal} total</span>
        </div>
        <div className="relative rounded-lg border border-brand-border/55 bg-[#0a1129] p-3">
          <Grid />
          <Bars data={docsSeries} />
        </div>
        <AxisLabels data={docsSeries} limit={10} />
      </div>
    </div>
  );
}
