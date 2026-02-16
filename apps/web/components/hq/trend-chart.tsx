export function TrendChart({
  title,
  data,
  color
}: {
  title: string;
  data: { label: string; value: number }[];
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 100 - (d.value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <svg viewBox="0 0 100 100" className="mt-3 h-36 w-full">
        <polyline fill="none" stroke="#e2e8f0" strokeWidth="1" points="0,100 100,100" />
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
