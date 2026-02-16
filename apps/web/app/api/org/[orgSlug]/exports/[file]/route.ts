import { prisma } from "@internflow/db/src";

function csv(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET(req: Request, { params }: { params: { orgSlug: string; file: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return new Response("Not found", { status: 404 });

  if (params.file === "reports.csv") {
    const rows = await prisma.logbookEntry.findMany({
      where: { user: { memberships: { some: { organizationId: org.id } } } },
      include: { user: true, approvals: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" }
    });

    const body = csv([
      ["studentEmail", "weekStart", "summary", "latestApproval", "submittedAt"],
      ...rows.map((r) => [
        r.user.email,
        r.weekStart.toISOString().slice(0, 10),
        r.summary,
        r.approvals[0]?.status ?? "PENDING",
        r.createdAt.toISOString()
      ])
    ]);
    return new Response(body, { headers: { "Content-Type": "text/csv" } });
  }

  if (params.file === "report-documents.csv") {
    const rows = await prisma.logbookEntry.findMany({
      where: { user: { memberships: { some: { organizationId: org.id } } } },
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    const body = csv([
      ["studentEmail", "weekStart", "hasDocument", "documentKey", "viewPath"],
      ...rows.map((r) => [
        r.user.email,
        r.weekStart.toISOString().slice(0, 10),
        String(Boolean(r.evidenceKey)),
        r.evidenceKey ?? "",
        r.evidenceKey ? `/api/org/${params.orgSlug}/logbooks/${r.id}/evidence` : ""
      ])
    ]);
    return new Response(body, { headers: { "Content-Type": "text/csv" } });
  }

  return new Response("Export not found", { status: 404 });
}
