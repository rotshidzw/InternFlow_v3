import { prisma } from "@internflow/db/src";

export default async function HQObservabilityPage() {
  const metrics = await prisma.usageMetricsDaily.findMany({ orderBy: { date: "desc" }, take: 30 });
  const avgActive = metrics.length ? Math.round(metrics.reduce((a, b) => a + b.activeUsers, 0) / metrics.length) : 0;
  const avgDocs = metrics.length ? Math.round(metrics.reduce((a, b) => a + b.docsUploaded, 0) / metrics.length) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Observability</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">Grafana strategy (placeholder): centralize tenant metrics dashboards and alerting for usage, failures, and queue lag.</p>
        <a href="https://grafana.com/" target="_blank" className="mt-2 inline-block text-sm text-blue-600 underline">Open Grafana docs</a>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Avg active users</p><p className="text-2xl font-semibold">{avgActive}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Avg docs uploaded</p><p className="text-2xl font-semibold">{avgDocs}</p></div>
      </div>
      <form action="/api/hq/observability/export" method="get"><button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Export metrics CSV</button></form>
    </div>
  );
}
