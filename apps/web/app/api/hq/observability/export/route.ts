import { prisma } from "@internflow/db/src";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";

function csv(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET() {
  const actor = await requirePlatformApiUser();
  if (!actor) return new Response("Forbidden", { status: 403 });
  const rows = await prisma.usageMetricsDaily.findMany({ include: { organization: true }, orderBy: { date: "desc" }, take: 200 });
  const body = csv([["tenant", "date", "activeUsers", "logbooksSubmitted", "docsUploaded", "applicationsCreated"], ...rows.map((r) => [r.organization.name, r.date.toISOString().slice(0, 10), r.activeUsers, r.logbooksSubmitted, r.docsUploaded, r.applicationsCreated].map(String))]);
  return new Response(body, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=hq-metrics.csv" } });
}
