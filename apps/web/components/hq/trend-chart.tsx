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
    <div className="if-panel rounded-2xl p-4">
      <h3 className="if-card-title">{title}</h3>
      <svg viewBox="0 0 100 100" className="mt-3 h-36 w-full">
        <polyline fill="none" stroke="rgba(112,104,161,0.45)" strokeWidth="1" points="0,100 100,100" />
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-brand-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
