import { prisma } from "@internflow/db/src";

function csv(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET(req: Request, { params }: { params: { orgSlug: string; file: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return new Response("Not found", { status: 404 });

  if (params.file === "stipend.csv") {
    const rows = await prisma.enrollment.findMany({ where: { organizationId: org.id }, include: { user: true, cohort: true } });
    const body = csv([["email", "cohort", "stipendPaid", "stipendMonth"], ...rows.map((r) => [r.user.email, r.cohort?.name ?? "", String(r.stipendPaid), r.stipendMonth ?? ""])]);
    return new Response(body, { headers: { "Content-Type": "text/csv" } });
  }

  const learners = await prisma.membership.findMany({ where: { organizationId: org.id, role: "STUDENT" }, include: { user: true } });
  const body = csv([["email", "name"], ...learners.map((l) => [l.user.email, l.user.name ?? ""]) ]);
  return new Response(body, { headers: { "Content-Type": "text/csv" } });
}
